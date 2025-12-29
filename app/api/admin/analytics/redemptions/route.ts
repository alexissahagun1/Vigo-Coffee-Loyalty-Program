import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { startOfDay, endOfDay, parseISO } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const supabase = createServiceRoleClient();

    // Build query
    let query = supabase
      .from("transactions")
      .select("*")
      .in("type", ["redemption_coffee", "redemption_meal"]);

    // Apply date filters
    if (startDate) {
      query = query.gte("created_at", startOfDay(parseISO(startDate)).toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", endOfDay(parseISO(endDate)).toISOString());
    }

    const { data: redemptions, error } = await query.order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch redemption data" },
        { status: 500 }
      );
    }

    // If no transactions found, fall back to counting from profiles.redeemed_rewards
    if (!redemptions || redemptions.length === 0) {
      // Fallback: Count from profiles.redeemed_rewards
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("redeemed_rewards");

      if (profilesError) {
        console.error("Error fetching profiles for redemption count:", profilesError);
        return NextResponse.json({
          success: true,
          coffee: 0,
          meal: 0,
          total: 0,
          breakdown: [],
        });
      }

      // Count redeemed rewards from profiles
      let coffee = 0;
      let meal = 0;
      const breakdown: Record<number, { coffee: number; meal: number }> = {};

      if (profiles) {
        profiles.forEach((profile) => {
          const redeemed = profile.redeemed_rewards || { coffees: [], meals: [] };
          
          if (Array.isArray(redeemed.coffees)) {
            redeemed.coffees.forEach((threshold: number) => {
              coffee++;
              if (!breakdown[threshold]) {
                breakdown[threshold] = { coffee: 0, meal: 0 };
              }
              breakdown[threshold].coffee++;
            });
          }
          
          if (Array.isArray(redeemed.meals)) {
            redeemed.meals.forEach((threshold: number) => {
              meal++;
              if (!breakdown[threshold]) {
                breakdown[threshold] = { coffee: 0, meal: 0 };
              }
              breakdown[threshold].meal++;
            });
          }
        });
      }

      return NextResponse.json({
        success: true,
        coffee,
        meal,
        total: coffee + meal,
        breakdown: Object.entries(breakdown).map(([threshold, counts]) => ({
          threshold: parseInt(threshold),
          coffee: counts.coffee,
          meal: counts.meal,
        })),
      });
    }

    // Count by type from transactions
    let coffee = 0;
    let meal = 0;

    redemptions.forEach((redemption) => {
      if (redemption.type === "redemption_coffee") {
        coffee++;
      } else if (redemption.type === "redemption_meal") {
        meal++;
      }
    });

    // Breakdown by points threshold
    const breakdown: Record<number, { coffee: number; meal: number }> = {};

    redemptions.forEach((redemption) => {
      const threshold = redemption.reward_points_threshold || 0;
      if (!breakdown[threshold]) {
        breakdown[threshold] = { coffee: 0, meal: 0 };
      }
      if (redemption.type === "redemption_coffee") {
        breakdown[threshold].coffee++;
      } else {
        breakdown[threshold].meal++;
      }
    });

    return NextResponse.json({
      success: true,
      coffee,
      meal,
      total: redemptions.length,
      breakdown: Object.entries(breakdown).map(([threshold, counts]) => ({
        threshold: parseInt(threshold),
        coffee: counts.coffee,
        meal: counts.meal,
      })),
    });
  } catch (error: any) {
    console.error("Redemptions analytics error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
