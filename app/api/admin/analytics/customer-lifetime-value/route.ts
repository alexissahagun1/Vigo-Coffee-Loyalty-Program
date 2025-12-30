import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { calculateCustomerLifetimeValue, Customer, Transaction } from "@/lib/analytics/prediction";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = Math.max(1, Math.min(1000, parseInt(searchParams.get("limit") || "50") || 50));
    const averagePurchaseValue = Math.max(0.01, parseFloat(searchParams.get("averagePurchaseValue") || "1") || 1);

    const supabase = createServiceRoleClient();

    // Get all customers
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, points_balance, total_purchases");

    if (profilesError) {
      return NextResponse.json(
        { error: profilesError.message || "Failed to fetch customers" },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        success: true,
        clvs: [],
      });
    }

    // Get all transactions
    const { data: transactions } = await supabase
      .from("transactions")
      .select("customer_id, created_at, type")
      .order("created_at", { ascending: true });

    // Get user creation dates
    const { data: profilesWithDates } = await supabase
      .from("profiles")
      .select("id, created_at")
      .in("id", profiles.map(p => p.id));
    
    const userMap = new Map<string, string>();
    if (profilesWithDates) {
      profilesWithDates.forEach((p: any) => {
        userMap.set(p.id, p.created_at || new Date().toISOString());
      });
    }
    
    // Prepare data
    const customers: Customer[] = profiles.map((p: any) => ({
      id: p.id,
      points_balance: p.points_balance || 0,
      total_purchases: p.total_purchases || 0,
      created_at: userMap.get(p.id) || new Date().toISOString(),
    }));

    const transactionData: Transaction[] =
      transactions?.map((t) => ({
        customer_id: t.customer_id,
        created_at: t.created_at,
        type: t.type,
      })) || [];

    // Calculate CLV
    const clvs = calculateCustomerLifetimeValue(customers, transactionData, averagePurchaseValue);

    // Get top customers
    const topClvs = clvs.slice(0, limit).map((clv) => {
      const customer = customers.find((c) => c.id === clv.customer_id);
      return {
        ...clv,
        customer_name: "Unknown", // Will be filled below
        points_balance: customer?.points_balance || 0,
        total_purchases: customer?.total_purchases || 0,
      };
    });

    // Get customer names
    if (topClvs.length > 0) {
      const { data: customerDetails } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in(
          "id",
          topClvs.map((c) => c.customer_id)
        );

      const customerMap = new Map(customerDetails?.map((c) => [c.id, c]) || []);
      topClvs.forEach((clv) => {
        const customer = customerMap.get(clv.customer_id);
        clv.customer_name = customer?.full_name || customer?.email || "Unknown";
      });
    }

    return NextResponse.json({
      success: true,
      clvs: topClvs,
      total: clvs.length,
      averagePurchaseValue,
    });
  } catch (error: any) {
    console.error("Customer lifetime value error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
