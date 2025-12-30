import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { format, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import {
  linearRegressionForecast,
  movingAverageForecast,
  exponentialSmoothingForecast,
  ForecastData,
} from "@/lib/analytics/forecast";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const metric = searchParams.get("metric") || "purchases"; // purchases, revenue
    const periods = Math.max(1, Math.min(365, parseInt(searchParams.get("periods") || "7") || 7));
    const method = searchParams.get("method") || "linear"; // linear, moving, exponential
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const supabase = createServiceRoleClient();

    // Default to last 30 days if no dates provided
    // Use current date/time to include today's data
    const defaultEndDate = endDate ? endOfDay(parseISO(endDate)) : endOfDay(new Date());
    const defaultStartDate = startDate
      ? startOfDay(parseISO(startDate))
      : startOfDay(subDays(defaultEndDate, 30));

    // Build query based on metric
    let query;
    if (metric === "purchases") {
      query = supabase
        .from("transactions")
        .select("created_at")
        .eq("type", "purchase");
    } else {
      // For revenue, we'd need to track purchase amounts
      // For now, use purchases as proxy
      query = supabase
        .from("transactions")
        .select("created_at")
        .eq("type", "purchase");
    }

    query = query
      .gte("created_at", startOfDay(defaultStartDate).toISOString())
      .lte("created_at", endOfDay(defaultEndDate).toISOString())
      .order("created_at", { ascending: true });

    const { data: transactions, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch forecast data" },
        { status: 500 }
      );
    }

    // If no transactions in transactions table, try to estimate from customer profiles
    if (!transactions || transactions.length === 0) {
      // Fallback: Use customer profiles to estimate historical purchases
      const { data: profiles } = await supabase
        .from("profiles")
        .select("total_purchases, points_balance, created_at, updated_at")
        .gt("points_balance", 0);

      if (profiles && profiles.length > 0) {
        // Estimate daily purchases based on customer activity
        // Distribute purchases over the date range
        const dailyData: Record<string, number> = {};
        const daysInRange = Math.ceil(
          (defaultEndDate.getTime() - defaultStartDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        profiles.forEach((profile: any) => {
          const purchases = profile.points_balance || 0; // Use points as proxy for purchases
          const createdDate = new Date(profile.created_at);
          const updatedDate = new Date(profile.updated_at || profile.created_at);
          
          // Estimate purchase distribution
          const daysActive = Math.max(1, Math.ceil(
            (updatedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
          ));
          const purchasesPerDay = purchases / Math.max(1, daysActive);
          
          // Distribute purchases across the date range
          for (let i = 0; i < daysInRange; i++) {
            const date = new Date(defaultStartDate);
            date.setDate(date.getDate() + i);
            const dateKey = format(date, "yyyy-MM-dd");
            
            // Only include if within customer's active period
            if (date >= createdDate && date <= updatedDate) {
              dailyData[dateKey] = (dailyData[dateKey] || 0) + purchasesPerDay;
            }
          }
        });

        // Convert to ForecastData format
        const historical: ForecastData[] = Object.entries(dailyData)
          .map(([date, value]) => ({ date, value: Math.round(value) }))
          .filter(d => d.value > 0)
          .sort((a, b) => a.date.localeCompare(b.date));

        if (historical.length > 0) {
          // Generate forecast
          let result;
          switch (method) {
            case "moving":
              result = movingAverageForecast(historical, periods);
              break;
            case "exponential":
              result = exponentialSmoothingForecast(historical, periods);
              break;
            default:
              result = linearRegressionForecast(historical, periods);
          }

          return NextResponse.json({
            success: true,
            ...result,
            method,
            metric,
            note: "Estimated from customer profiles (transaction data unavailable)",
          });
        }
      }

      // If still no data, return empty
      return NextResponse.json({
        success: true,
        historical: [],
        forecast: [],
        confidence: "low",
        trend: "stable",
        percentageChange: 0,
      });
    }

    // Group by day
    const dailyData: Record<string, number> = {};
    transactions.forEach((transaction) => {
      const date = format(new Date(transaction.created_at), "yyyy-MM-dd");
      dailyData[date] = (dailyData[date] || 0) + 1;
    });

    // Convert to ForecastData format
    const historical: ForecastData[] = Object.entries(dailyData)
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Generate forecast based on method
    let result;
    switch (method) {
      case "moving":
        result = movingAverageForecast(historical, periods);
        break;
      case "exponential":
        result = exponentialSmoothingForecast(historical, periods);
        break;
      default: // linear
        result = linearRegressionForecast(historical, periods);
    }

    return NextResponse.json({
      success: true,
      ...result,
      method,
      metric,
    });
  } catch (error: any) {
    console.error("Forecast analytics error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
