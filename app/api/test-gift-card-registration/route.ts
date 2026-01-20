import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireEmployeeAuth } from "@/lib/auth/employee-auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/test-gift-card-registration?serialNumber=xxx
 * 
 * Check if a gift card pass is registered with any devices
 * Useful for debugging why push notifications aren't working
 */
export async function GET(req: NextRequest) {
  try {
    // SECURITY: Require employee authentication
    const authError = await requireEmployeeAuth();
    if (authError) {
      return authError;
    }

    const { searchParams } = new URL(req.url);
    const serialNumber = searchParams.get("serialNumber");

    if (!serialNumber) {
      return NextResponse.json(
        { error: "serialNumber parameter is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const passTypeIdentifier = process.env.GIFT_CARD_PASS_TYPE_ID || 'pass.com.vigocoffee.giftcard';

    // Check if gift card exists
    const { data: giftCard, error: giftCardError } = await supabase
      .from('gift_cards')
      .select('id, serial_number, recipient_name, balance_mxn')
      .eq('serial_number', serialNumber)
      .single();

    if (giftCardError || !giftCard) {
      return NextResponse.json(
        { error: "Gift card not found" },
        { status: 404 }
      );
    }

    // Check registrations
    const { data: registrations, error: regError } = await supabase
      .from('pass_registrations')
      .select('*')
      .eq('serial_number', serialNumber)
      .eq('pass_type_identifier', passTypeIdentifier);

    if (regError) {
      return NextResponse.json(
        { 
          error: "Error checking registrations",
          details: regError.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      giftCard: {
        serialNumber: giftCard.serial_number,
        recipientName: giftCard.recipient_name,
        balance: Number(giftCard.balance_mxn),
      },
      passTypeIdentifier,
      registrations: registrations || [],
      registrationCount: registrations?.length || 0,
      isRegistered: (registrations?.length || 0) > 0,
      message: (registrations?.length || 0) > 0
        ? `Pass is registered on ${registrations.length} device(s)`
        : "Pass is not registered yet. Apple will register it within 1-2 minutes of adding to Wallet."
    });
  } catch (error: any) {
    console.error("Test registration error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
