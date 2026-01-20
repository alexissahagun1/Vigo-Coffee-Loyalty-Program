import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireEmployeeAuth } from "@/lib/auth/employee-auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    // SECURITY: Require employee authentication
    const authError = await requireEmployeeAuth();
    if (authError) {
      return authError;
    }

    const searchParams = req.nextUrl.searchParams;
    const serialNumber = searchParams.get("serialNumber");

    // Validate serial number
    if (!serialNumber || typeof serialNumber !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid serialNumber" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Query the gift_cards table to find the gift card by serial number
    const result = await supabase
      .from("gift_cards")
      .select("*")
      .eq("serial_number", serialNumber)
      .single();

    const giftCard = result.data;
    const giftCardError = result.error;

    // Check if gift card was not found
    if (giftCardError || !giftCard) {
      return NextResponse.json(
        { 
          error: "Gift card not found",
          details: giftCardError?.message
        },
        { status: 404 }
      );
    }

    // Check if gift card is active
    if (!giftCard.is_active) {
      return NextResponse.json(
        { error: "Gift card is inactive" },
        { status: 400 }
      );
    }

    // Get balance as number
    const balance = Number(giftCard.balance_mxn) || 0;
    const initialBalance = Number(giftCard.initial_balance_mxn) || 0;

    // Return gift card information
    return NextResponse.json({
      success: true,
      giftCard: {
        id: giftCard.id,
        serialNumber: giftCard.serial_number,
        recipientName: giftCard.recipient_name,
        balance: balance,
        initialBalance: initialBalance,
        isActive: giftCard.is_active,
        claimedAt: giftCard.claimed_at,
        recipientUserId: giftCard.recipient_user_id,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error("❌ Gift card scan API error:", error);
    
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error?.message
      },
      { status: 500 }
    );
  }
}
