import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdminAuth } from "@/lib/auth/employee-auth";

// GET - Get statistics
export async function GET(req: NextRequest) {
  try {
    // SECURITY: Require admin authentication
    const authError = await requireAdminAuth();
    if (authError) {
      return authError;
    }

    const supabase = createServiceRoleClient();

    // Run all independent queries in parallel for better performance
    const [
      { count: totalCustomers },
      { count: totalEmployees },
      { count: activeEmployees },
      { data: profilesData },
      { count: pendingInvitations },
      { data: topCustomers },
    ] = await Promise.all([
      // Get total customers
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true }),
      
      // Get total employees
      supabase
        .from('employees')
        .select('*', { count: 'exact', head: true }),
      
      // Get active employees
      supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
      
      // Get all profile data needed for calculations (points, purchases, rewards)
      supabase
        .from('profiles')
        .select('points_balance, total_purchases, redeemed_rewards'),
      
      // Get pending invitations
      supabase
        .from('employee_invitations')
        .select('*', { count: 'exact', head: true })
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString()),
      
      // Get top customers by points
      supabase
        .from('profiles')
        .select('id, full_name, points_balance, total_purchases')
        .order('points_balance', { ascending: false })
        .limit(10),
    ]);

    // Calculate totals from the profiles data
    // Since 1 purchase = 1 point and points aren't deducted on redemption,
    // total purchases should equal total points
    const totalPoints = profilesData?.reduce((sum, p) => sum + (p.points_balance || 0), 0) || 0;
    const totalPurchases = totalPoints; // 1 purchase = 1 point, so they're the same

    // Calculate rewards redeemed
    const profilesWithRewards = profilesData;

    let rewardsRedeemed = 0;
    let coffeeRewardsRedeemed = 0;
    let mealRewardsRedeemed = 0;

    if (profilesWithRewards) {
      profilesWithRewards.forEach((profile) => {
        const redeemed = profile.redeemed_rewards || { coffees: [], meals: [] };
        if (Array.isArray(redeemed.coffees)) {
          coffeeRewardsRedeemed += redeemed.coffees.length;
        }
        if (Array.isArray(redeemed.meals)) {
          mealRewardsRedeemed += redeemed.meals.length;
        }
      });
      rewardsRedeemed = coffeeRewardsRedeemed + mealRewardsRedeemed;
    }

    // Calculate reward progress percentages (simplified - could be more sophisticated)
    // For coffee: assume max potential is totalPoints / 10
    // For meal: assume max potential is totalPoints / 25
    const maxCoffeeRewards = totalPoints > 0 ? Math.floor(totalPoints / 10) : 0;
    const maxMealRewards = totalPoints > 0 ? Math.floor(totalPoints / 25) : 0;
    const coffeeRewardsProgress = maxCoffeeRewards > 0 
      ? Math.min(100, Math.round((coffeeRewardsRedeemed / maxCoffeeRewards) * 100))
      : 0;
    const mealRewardsProgress = maxMealRewards > 0
      ? Math.min(100, Math.round((mealRewardsRedeemed / maxMealRewards) * 100))
      : 0;

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
        rewardsRedeemed,
        coffeeRewardsRedeemed,
        mealRewardsRedeemed,
        coffeeRewardsProgress,
        mealRewardsProgress,
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

