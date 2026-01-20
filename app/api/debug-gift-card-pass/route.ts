import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireEmployeeAuth } from "@/lib/auth/employee-auth";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/debug-gift-card-pass?serialNumber=xxx
 * 
 * Diagnostic endpoint to check what webServiceURL would be used for a gift card pass
 * This helps debug why Apple isn't registering the device
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

    // Check if gift card exists
    const { data: giftCard, error: giftCardError } = await supabase
      .from('gift_cards')
      .select('id, serial_number, recipient_name, balance_mxn, created_at')
      .eq('serial_number', serialNumber)
      .single();

    if (giftCardError || !giftCard) {
      return NextResponse.json(
        { error: "Gift card not found" },
        { status: 404 }
      );
    }

    // Simulate the same logic used in pass generation
    let baseUrl: string;
    
    if (process.env.VERCEL_URL) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
      baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    } else {
      baseUrl = 'http://localhost:3000';
    }
    
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }

    const isPublicUrl = !baseUrl.includes('localhost') && 
                       !baseUrl.includes('127.0.0.1') && 
                       !baseUrl.match(/192\.168\.\d+\.\d+/) &&
                       !baseUrl.match(/10\.\d+\.\d+\.\d+/) &&
                       !baseUrl.match(/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+/);

    const passTypeIdentifier = process.env.GIFT_CARD_PASS_TYPE_ID || 'pass.com.vigocoffee.giftcard';
    const webServiceURL = isPublicUrl ? `${baseUrl}/api/pass/giftcard` : null;

    // Check registrations
    const { data: registrations, error: regError } = await supabase
      .from('pass_registrations')
      .select('*')
      .eq('serial_number', serialNumber);

    return NextResponse.json({
      success: true,
      giftCard: {
        serialNumber: giftCard.serial_number,
        recipientName: giftCard.recipient_name,
        balance: Number(giftCard.balance_mxn),
        createdAt: giftCard.created_at,
      },
      passConfiguration: {
        passTypeIdentifier,
        baseUrl,
        isPublicUrl,
        webServiceURL,
        wouldHaveWebServiceURL: isPublicUrl,
      },
      environment: {
        VERCEL_URL: process.env.VERCEL_URL || 'not set',
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'not set',
        GIFT_CARD_PASS_TYPE_ID: process.env.GIFT_CARD_PASS_TYPE_ID || 'not set (using default)',
      },
      registrations: registrations || [],
      registrationCount: registrations?.length || 0,
      diagnostics: {
        issue: !webServiceURL 
          ? "Pass would be generated WITHOUT webServiceURL - Apple cannot register device"
          : registrations?.length === 0
          ? "Pass has webServiceURL but no registrations found - Apple hasn't called registration endpoint yet"
          : "Pass has webServiceURL and registrations exist",
        recommendation: !webServiceURL
          ? "Check VERCEL_URL or NEXT_PUBLIC_APP_URL environment variables. Pass must be generated from a public URL."
          : registrations?.length === 0
          ? "Wait 1-2 minutes after adding pass to Wallet, or check if registration endpoint is accessible"
          : "Registrations exist - push notifications should work",
      }
    });
  } catch (error: any) {
    console.error("Debug gift card pass error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
