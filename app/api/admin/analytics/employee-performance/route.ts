import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { startOfDay, endOfDay, parseISO } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const employeeId = searchParams.get("employeeId");

    const supabase = createServiceRoleClient();

    // Build query
    let query = supabase.from("transactions").select("employee_id, type, created_at");

    // Apply date filters
    if (startDate) {
      query = query.gte("created_at", startOfDay(parseISO(startDate)).toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", endOfDay(parseISO(endDate)).toISOString());
    }

    // Filter by employee if specified
    if (employeeId) {
      query = query.eq("employee_id", employeeId);
    } else {
      // Only get transactions with employee_id
      query = query.not("employee_id", "is", null);
    }

    const { data: transactions, error } = await query.order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch employee performance data" },
        { status: 500 }
      );
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        employees: [],
        total: 0,
      });
    }

    // Group by employee
    const employeeStats: Record<
      string,
      { purchases: number; redemptions: number; total: number }
    > = {};

    transactions.forEach((transaction) => {
      if (!transaction.employee_id) return;

      if (!employeeStats[transaction.employee_id]) {
        employeeStats[transaction.employee_id] = { purchases: 0, redemptions: 0, total: 0 };
      }

      if (transaction.type === "purchase") {
        employeeStats[transaction.employee_id].purchases++;
      } else {
        employeeStats[transaction.employee_id].redemptions++;
      }
      employeeStats[transaction.employee_id].total++;
    });

    // Get employee names
    const employeeIds = Object.keys(employeeStats);
    const { data: employees } = await supabase
      .from("employees")
      .select("id, full_name, username, email")
      .in("id", employeeIds);

    const employeeMap = new Map(
      employees?.map((e) => [e.id, { name: e.full_name || e.username || e.email, ...e }]) || []
    );

    // Format response
    const employeesData = Object.entries(employeeStats)
      .map(([id, stats]) => ({
        employee_id: id,
        employee_name: employeeMap.get(id)?.name || "Unknown",
        purchases: stats.purchases,
        redemptions: stats.redemptions,
        total: stats.total,
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      success: true,
      employees: employeesData,
      total: transactions.length,
    });
  } catch (error: any) {
    console.error("Employee performance analytics error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


