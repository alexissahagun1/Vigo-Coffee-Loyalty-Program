import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdminAuth } from "@/lib/auth/employee-auth";


interface FormattedTransaction {
  id: string;
  customer_id: string;
  customer_name: string | null;
  customer_email: string | null;
  employee_id: string | null;
  employee_name: string | null;
  employee_username: string | null;
  type: 'purchase' | 'redemption_coffee' | 'redemption_meal';
  points_change: number;
  points_balance_after: number;
  reward_points_threshold: number | null;
  created_at: string;
}

export async function GET(req: NextRequest) {
  try {
    // SECURITY: Require admin authentication
    const authError = await requireAdminAuth();
    if (authError) {
      return authError;
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const customerId = searchParams.get("customerId");
    const employeeId = searchParams.get("employeeId");

    const supabase = createServiceRoleClient();

    // Build query - fetch all transactions (no limit for admin view)
    let query = supabase
      .from('transactions')
      .select('*', { count: 'exact' });

    // Apply filters
    if (type && (type === 'purchase' || type === 'redemption_coffee' || type === 'redemption_meal')) {
      query = query.eq('type', type);
    }

    if (startDate) {
      query = query.gte('created_at', new Date(startDate).toISOString());
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', end.toISOString());
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    // Order by newest first (no pagination - fetch all)
    const { data: transactionsData, error, count } = await query
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Transactions API error:', error);
      return NextResponse.json(
        { error: error.message || "Failed to fetch transactions" },
        { status: 500 }
      );
    }

    if (!transactionsData || transactionsData.length === 0) {
      return NextResponse.json({
        success: true,
        transactions: [],
        total: 0,
      });
    }

    // Get unique customer and employee IDs
    const customerIds = [...new Set(transactionsData.map((t: any) => t.customer_id).filter(Boolean))];
    const employeeIds = [...new Set(transactionsData.map((t: any) => t.employee_id).filter(Boolean))];

    // Fetch customer profiles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', customerIds);

    // Fetch employee data
    let employees: any[] = [];
    if (employeeIds.length > 0) {
      const { data: employeeData } = await supabase
        .from('employees')
        .select('id, full_name, username')
        .in('id', employeeIds);
      employees = employeeData || [];
    }

    // Create lookup maps
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
    const employeeMap = new Map(employees.map((e) => [e.id, e]));

    // Format the response
    const formattedTransactions: FormattedTransaction[] = transactionsData.map((transaction: any) => {
      const profile = profileMap.get(transaction.customer_id);
      const employee = transaction.employee_id ? employeeMap.get(transaction.employee_id) : null;

      return {
        id: transaction.id,
        customer_id: transaction.customer_id,
        customer_name: profile?.full_name || null,
        customer_email: profile?.email || null,
        employee_id: transaction.employee_id,
        employee_name: employee?.full_name || null,
        employee_username: employee?.username || null,
        type: transaction.type,
        points_change: transaction.points_change,
        points_balance_after: transaction.points_balance_after,
        reward_points_threshold: transaction.reward_points_threshold,
        created_at: transaction.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      total: count || 0,
    });

  } catch (error: any) {
    console.error('Transactions API error:', error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

