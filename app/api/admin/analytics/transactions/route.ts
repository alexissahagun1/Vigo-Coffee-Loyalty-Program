import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const groupBy = searchParams.get("groupBy") || "day"; // day, week, month

    const supabase = createServiceRoleClient();

    // Build query
    let query = supabase.from("transactions").select("*");

    // Apply date filters
    // For endDate, use endOfDay to include all of today's data
    if (startDate) {
      query = query.gte("created_at", startOfDay(parseISO(startDate)).toISOString());
    }
    if (endDate) {
      // Use endOfDay to include all transactions up to the end of the selected day
      // This ensures today's data is included when endDate is today
      query = query.lte("created_at", endOfDay(parseISO(endDate)).toISOString());
    }

    const { data: transactions, error } = await query.order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch transactions" },
        { status: 500 }
      );
    }

    // If no transactions, try to estimate from profiles data for historical consistency
    if (!transactions || transactions.length === 0) {
      // Get customer data to show historical purchases
      const { data: profiles } = await supabase
        .from("profiles")
        .select("total_purchases, created_at, updated_at")
        .gt("total_purchases", 0);

      if (profiles && profiles.length > 0) {
        // Estimate transaction dates based on profile creation/update
        const estimatedTransactions: any[] = [];
        profiles.forEach((profile: any) => {
          const purchases = Number(profile.total_purchases) || 0;
          const createdDate = new Date(profile.created_at);
          const updatedDate = new Date(profile.updated_at);
          
          // Distribute purchases over time (rough estimate)
          for (let i = 0; i < purchases; i++) {
            const daysSinceCreated = (updatedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
            const estimatedDate = new Date(
              createdDate.getTime() + (daysSinceCreated / purchases) * i * (1000 * 60 * 60 * 24)
            );
            
            // Only include if within date range
            if (startDate && estimatedDate < startOfDay(parseISO(startDate))) continue;
            if (endDate && estimatedDate > endOfDay(parseISO(endDate))) continue;
            
            estimatedTransactions.push({
              created_at: estimatedDate.toISOString(),
              type: "purchase",
            });
          }
        });

        if (estimatedTransactions.length > 0) {
          // Use estimated transactions for grouping
          const grouped: Record<string, { purchases: number; redemptions: number; total: number }> = {};
          
          estimatedTransactions.forEach((transaction) => {
            let key: string;
            const date = new Date(transaction.created_at);

            switch (groupBy) {
              case "week":
                key = format(date, "yyyy-'W'ww");
                break;
              case "month":
                key = format(date, "yyyy-MM");
                break;
              default:
                key = format(date, "yyyy-MM-dd");
            }

            if (!grouped[key]) {
              grouped[key] = { purchases: 0, redemptions: 0, total: 0 };
            }

            grouped[key].purchases++;
            grouped[key].total++;
          });

          const data = Object.entries(grouped)
            .map(([date, counts]) => ({
              date,
              purchases: counts.purchases,
              redemptions: counts.redemptions,
              total: counts.total,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

          return NextResponse.json({
            success: true,
            data,
            grouped,
            note: "Estimated from customer profiles (historical data before transaction logging)",
          });
        }
      }

      return NextResponse.json({
        success: true,
        data: [],
        grouped: {},
      });
    }

    // Group by time period
    const grouped: Record<string, { purchases: number; redemptions: number; total: number }> = {};

    transactions.forEach((transaction) => {
      let key: string;
      const date = new Date(transaction.created_at);

      switch (groupBy) {
        case "week":
          key = format(date, "yyyy-'W'ww");
          break;
        case "month":
          key = format(date, "yyyy-MM");
          break;
        default: // day
          key = format(date, "yyyy-MM-dd");
      }

      if (!grouped[key]) {
        grouped[key] = { purchases: 0, redemptions: 0, total: 0 };
      }

      if (transaction.type === "purchase") {
        grouped[key].purchases++;
      } else {
        grouped[key].redemptions++;
      }
      grouped[key].total++;
    });

    // Convert to array format
    const data = Object.entries(grouped)
      .map(([date, counts]) => ({
        date,
        purchases: counts.purchases,
        redemptions: counts.redemptions,
        total: counts.total,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      data,
      grouped,
    });
  } catch (error: any) {
    console.error("Analytics transactions error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
