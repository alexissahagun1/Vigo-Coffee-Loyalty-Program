import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdminAuth } from "@/lib/auth/employee-auth";

export async function GET(req: NextRequest) {
  try {
    const authError = await requireAdminAuth();
    if (authError) {
      return authError;
    }

    const supabase = createServiceRoleClient();

    // Get all gift cards data
    const { data: giftCards, error } = await supabase
      .from('gift_cards')
      .select('balance_mxn, initial_balance_mxn, is_active, claimed_at');

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to fetch gift card statistics" },
        { status: 500 }
      );
    }

    // Calculate statistics
    const totalGiftCards = giftCards?.length || 0;
    const totalBalanceIssued = giftCards?.reduce((sum, gc) => sum + Number(gc.initial_balance_mxn || 0), 0) || 0;
    const totalBalanceRemaining = giftCards?.reduce((sum, gc) => sum + Number(gc.balance_mxn || 0), 0) || 0;
    const totalBalanceUsed = totalBalanceIssued - totalBalanceRemaining;
    const activeGiftCards = giftCards?.filter(gc => gc.is_active).length || 0;
    const claimedGiftCards = giftCards?.filter(gc => gc.claimed_at !== null).length || 0;
    const averageGiftCardValue = totalGiftCards > 0 ? totalBalanceIssued / totalGiftCards : 0;

    // Get top gift cards by balance
    const { data: topGiftCards } = await supabase
      .from('gift_cards')
      .select('id, serial_number, recipient_name, balance_mxn, initial_balance_mxn')
      .order('balance_mxn', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      stats: {
        totalGiftCards,
        totalBalanceIssued,
        totalBalanceRemaining,
        totalBalanceUsed,
        activeGiftCards,
        claimedGiftCards,
        averageGiftCardValue,
        topGiftCards: topGiftCards || [],
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
