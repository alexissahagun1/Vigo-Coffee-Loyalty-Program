import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/gift-cards/share/[shareToken]
 * 
 * Public endpoint to fetch gift card details by share token
 * Used by the shareable link page
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ shareToken: string }> }
) {
  try {
    const { shareToken } = await params;

    if (!shareToken) {
      return NextResponse.json(
        { error: "Share token is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Fetch gift card by share token
    const { data: giftCard, error } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('share_token', shareToken)
      .single();

    if (error || !giftCard) {
      return NextResponse.json(
        { error: "Gift card not found" },
        { status: 404 }
      );
    }

    // Return gift card data (public info only)
    return NextResponse.json({
      success: true,
      giftCard: {
        id: giftCard.id,
        serialNumber: giftCard.serial_number,
        recipientName: giftCard.recipient_name,
        balance: Number(giftCard.balance_mxn) || 0,
        initialBalance: Number(giftCard.initial_balance_mxn) || 0,
        isActive: giftCard.is_active,
        claimedAt: giftCard.claimed_at,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error("Gift card share API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
