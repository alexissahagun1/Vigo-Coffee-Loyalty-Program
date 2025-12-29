import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { predictNextPurchase, Customer, Transaction } from "@/lib/analytics/prediction";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const daysAhead = parseInt(searchParams.get("daysAhead") || "14");

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
        predictions: [],
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

    // Predict next purchases
    const predictions = predictNextPurchase(customers, transactionData);

    // Filter to predictions within the specified days ahead
    const now = new Date();
    const filtered = predictions
      .filter((p) => {
        const predictedDate = new Date(p.predicted_date);
        const daysUntil = Math.floor(
          (predictedDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysUntil >= 0 && daysUntil <= daysAhead;
      })
      .sort((a, b) => a.days_until - b.days_until)
      .slice(0, limit)
      .map((prediction) => {
        const customer = customers.find((c) => c.id === prediction.customer_id);
        return {
          ...prediction,
          customer_name: "Unknown", // Will be filled below
          points_balance: customer?.points_balance || 0,
          total_purchases: customer?.total_purchases || 0,
        };
      });

    // Get customer names
    if (filtered.length > 0) {
      const { data: customerDetails } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in(
          "id",
          filtered.map((p) => p.customer_id)
        );

      const customerMap = new Map(customerDetails?.map((c) => [c.id, c]) || []);
      filtered.forEach((prediction) => {
        const customer = customerMap.get(prediction.customer_id);
        prediction.customer_name = customer?.full_name || customer?.email || "Unknown";
      });
    }

    return NextResponse.json({
      success: true,
      predictions: filtered,
      total: predictions.length,
    });
  } catch (error: any) {
    console.error("Next purchase prediction error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
