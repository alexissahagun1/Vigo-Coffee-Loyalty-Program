import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { calculateChurnRisk, Customer, Transaction } from "@/lib/analytics/prediction";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const method = searchParams.get("method") || "rules"; // rules, logistic
    const limit = Math.max(1, Math.min(1000, parseInt(searchParams.get("limit") || "50") || 50));

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
        atRisk: [],
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

    // Calculate churn risk
    const risks = calculateChurnRisk(customers, transactionData);

    // Filter to at-risk customers (risk_score >= 30)
    const atRisk = risks
      .filter((r) => r.risk_score >= 30)
      .slice(0, limit)
      .map((risk) => {
        const customer = customers.find((c) => c.id === risk.customer_id);
        return {
          ...risk,
          customer_name: "Unknown", // Will be filled below
          points_balance: customer?.points_balance || 0,
          total_purchases: customer?.total_purchases || 0,
        };
      });

    // Get customer names
    if (atRisk.length > 0) {
      const { data: customerDetails } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in(
          "id",
          atRisk.map((r) => r.customer_id)
        );

      const customerMap = new Map(customerDetails?.map((c) => [c.id, c]) || []);
      atRisk.forEach((risk) => {
        const customer = customerMap.get(risk.customer_id);
        risk.customer_name = customer?.full_name || customer?.email || "Unknown";
      });
    }

    return NextResponse.json({
      success: true,
      atRisk,
      method,
      total: risks.length,
    });
  } catch (error: any) {
    console.error("Churn risk analytics error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

