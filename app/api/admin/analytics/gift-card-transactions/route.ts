import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { format, startOfDay, endOfDay, parseISO } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const groupBy = searchParams.get("groupBy") || "day"; // day, week, month

    const supabase = createServiceRoleClient();

    // Build query
    let query = supabase.from("gift_card_transactions").select("*");

    // Apply date filters
    if (startDate) {
      query = query.gte("created_at", startOfDay(parseISO(startDate)).toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", endOfDay(parseISO(endDate)).toISOString());
    }

    const { data: transactions, error } = await query.order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch gift card transactions" },
        { status: 500 }
      );
    }

    // If no transactions, return empty data
    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        grouped: {},
      });
    }

    // Group by time period
    const grouped: Record<string, { 
      transactions: number; 
      totalAmount: number; 
      averageAmount: number;
    }> = {};

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
        grouped[key] = { transactions: 0, totalAmount: 0, averageAmount: 0 };
      }

      const amount = Math.abs(Number(transaction.amount_mxn) || 0);
      grouped[key].transactions++;
      grouped[key].totalAmount += amount;
    });

    // Calculate averages
    Object.keys(grouped).forEach((key) => {
      if (grouped[key].transactions > 0) {
        grouped[key].averageAmount = grouped[key].totalAmount / grouped[key].transactions;
      }
    });

    // Convert to array format
    const data = Object.entries(grouped)
      .map(([date, counts]) => ({
        date,
        transactions: counts.transactions,
        totalAmount: counts.totalAmount,
        averageAmount: counts.averageAmount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      success: true,
      data,
      grouped,
    });
  } catch (error: any) {
    console.error("Gift card transactions analytics error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
