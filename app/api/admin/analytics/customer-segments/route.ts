import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  ruleBasedSegmentation,
  kmeansSegmentation,
  rfmAnalysis,
  getSegmentDistribution,
  CustomerData,
} from "@/lib/analytics/segmentation";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const method = searchParams.get("method") || "rules"; // rules, kmeans, rfm

    const supabase = createServiceRoleClient();

    // Get all customers
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, points_balance, total_purchases");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return NextResponse.json(
        { error: profilesError.message || "Failed to fetch customers" },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({
        success: true,
        segments: [],
        distribution: [],
        method,
      });
    }

    // Get user creation dates from profiles.created_at
    const { data: profilesWithDates } = await supabase
      .from("profiles")
      .select("id, created_at")
      .in("id", profiles.map(p => p.id));
    
    const userMap = new Map<string, string>();
    
    if (profilesWithDates && profilesWithDates.length > 0) {
      profilesWithDates.forEach((p: any) => {
        userMap.set(p.id, p.created_at || new Date().toISOString());
      });
    }
    
    // If no created_at found, use current date as fallback
    profiles.forEach((p: any) => {
      if (!userMap.has(p.id)) {
        userMap.set(p.id, new Date().toISOString());
      }
    });

    // Get last transaction date for each customer
    const { data: lastTransactions } = await supabase
      .from("transactions")
      .select("customer_id, created_at")
      .order("created_at", { ascending: false });

    const lastTransactionMap = new Map<string, string>();
    lastTransactions?.forEach((t: any) => {
      if (!lastTransactionMap.has(t.customer_id)) {
        lastTransactionMap.set(t.customer_id, t.created_at);
      }
    });

    // Prepare customer data
    const customers: CustomerData[] = profiles.map((profile: any) => ({
      id: profile.id,
      points_balance: profile.points_balance || 0,
      total_purchases: profile.total_purchases || 0,
      created_at: userMap.get(profile.id) || new Date().toISOString(),
      last_transaction_date: lastTransactionMap.get(profile.id),
    }));

    // Apply segmentation method
    let segments;
    try {
      switch (method) {
        case "kmeans":
          segments = kmeansSegmentation(customers);
          break;
        case "rfm":
          segments = rfmAnalysis(customers);
          break;
        default: // rules
          segments = ruleBasedSegmentation(customers);
      }
    } catch (segError: any) {
      console.error("Segmentation error:", segError);
      // Fallback to rule-based if other methods fail
      segments = ruleBasedSegmentation(customers);
    }

    // Get distribution
    const distribution = getSegmentDistribution(segments);

    // Get customer details for each segment
    const { data: customerDetails } = await supabase
      .from("profiles")
      .select("id, full_name, email, points_balance, total_purchases")
      .in(
        "id",
        segments.map((s) => s.customer_id)
      );

    const customerMap = new Map(customerDetails?.map((c: any) => [c.id, c]) || []);

    // Format response
    const customersBySegment = segments.map((segment) => {
      const customer = customerMap.get(segment.customer_id);
      return {
        ...segment,
        customer_name: customer?.full_name || customer?.email || "Unknown",
        points_balance: customer?.points_balance || 0,
        total_purchases: customer?.total_purchases || 0,
      };
    });

    return NextResponse.json({
      success: true,
      segments: customersBySegment,
      distribution,
      method,
    });
  } catch (error: any) {
    console.error("Customer segments analytics error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
