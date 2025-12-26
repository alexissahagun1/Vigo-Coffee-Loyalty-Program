import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// GET - Get statistics
export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    // Get total customers
    const { count: totalCustomers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get total employees
    const { count: totalEmployees } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true });

    // Get active employees
    const { count: activeEmployees } = await supabase
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get total points across all customers
    const { data: pointsData } = await supabase
      .from('profiles')
      .select('points_balance');

    const totalPoints = pointsData?.reduce((sum, p) => sum + (p.points_balance || 0), 0) || 0;

    // Get total purchases
    const { data: purchasesData } = await supabase
      .from('profiles')
      .select('total_purchases');

    const totalPurchases = purchasesData?.reduce((sum, p) => sum + (Number(p.total_purchases) || 0), 0) || 0;

    // Get pending invitations
    const { count: pendingInvitations } = await supabase
      .from('employee_invitations')
      .select('*', { count: 'exact', head: true })
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString());

    // Get top customers by points
    const { data: topCustomers } = await supabase
      .from('profiles')
      .select('id, full_name, points_balance, total_purchases')
      .order('points_balance', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      stats: {
        totalCustomers: totalCustomers || 0,
        totalEmployees: totalEmployees || 0,
        activeEmployees: activeEmployees || 0,
        totalPoints,
        totalPurchases,
        pendingInvitations: pendingInvitations || 0,
        topCustomers: topCustomers || [],
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

