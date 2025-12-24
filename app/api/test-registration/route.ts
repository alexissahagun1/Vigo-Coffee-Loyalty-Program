import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Test endpoint to check registration status and verify endpoint accessibility
 * GET /api/test-registration?userId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    const supabase = await createClient();

    // Check if user has any registrations
    let registrations = [];
    if (userId) {
      const { data, error } = await supabase
        .from('pass_registrations')
        .select('*')
        .eq('serial_number', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        registrations = data;
      }
    }

    // Get total registrations count
    const { count: totalCount } = await supabase
      .from('pass_registrations')
      .select('*', { count: 'exact', head: true });

    // Get webServiceURL that would be used
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
      'http://localhost:3000');
    
    let finalBaseUrl = baseUrl;
    if (!finalBaseUrl.startsWith('http://') && !finalBaseUrl.startsWith('https://')) {
      finalBaseUrl = `https://${finalBaseUrl}`;
    }

    const webServiceURL = `${finalBaseUrl}/api/pass`;

    return NextResponse.json({
      success: true,
      webServiceURL,
      baseUrl: finalBaseUrl,
      totalRegistrations: totalCount || 0,
      userRegistrations: registrations.length,
      registrations: registrations,
      message: userId 
        ? `User ${userId} has ${registrations.length} registration(s)`
        : `Total registrations: ${totalCount || 0}`,
      checkEndpoint: `${webServiceURL}/v1/devices/{deviceId}/registrations/{passTypeId}/{serialNumber}`,
      note: "Apple will call the registration endpoint automatically when a pass is added to Wallet"
    });
  } catch (error: any) {
    console.error('❌ Test registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}

