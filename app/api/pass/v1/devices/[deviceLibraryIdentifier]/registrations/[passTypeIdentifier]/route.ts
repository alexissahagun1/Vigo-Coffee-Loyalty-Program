import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/pass/v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}
 * 
 * Returns list of serial numbers for passes registered to this device
 * Called by Apple when device checks for updates
 * 
 * When Apple sends a "What changed?" request with passesUpdatedSince parameter,
 * the response must include a lastUpdated timestamp.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ deviceLibraryIdentifier: string; passTypeIdentifier: string }> }
) {
  try {
    const { deviceLibraryIdentifier, passTypeIdentifier } = await params;
    
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 📋 Get serial numbers request`);
    console.log(`[${timestamp}]    Device: ${deviceLibraryIdentifier}`);
    console.log(`[${timestamp}]    Pass Type: ${passTypeIdentifier}`);
    
    // Check for "What changed?" request (passesUpdatedSince query parameter)
    const passesUpdatedSince = req.nextUrl.searchParams.get('passesUpdatedSince');
    const isWhatChangedRequest = !!passesUpdatedSince;
    
    if (isWhatChangedRequest) {
      console.log(`[${timestamp}] 🔄 "What changed?" request detected`);
      console.log(`[${timestamp}]    passesUpdatedSince: ${passesUpdatedSince}`);
    }
    
    // Log all headers for debugging
    const authHeader = req.headers.get('authorization');
    console.log(`[${timestamp}]    Authorization header: ${authHeader ? 'Present' : 'Missing'}`);
    if (authHeader) {
      console.log(`[${timestamp}]    Auth header value: ${authHeader.substring(0, 20)}...`);
    }
    
    // Validate authentication token from Apple
    // Note: Apple's "Get serial #s" endpoint may not always send auth token
    // For now, we'll allow it to proceed but log the absence
    const authToken = authHeader?.replace('ApplePass ', '');
    if (!authToken) {
      console.warn(`[${timestamp}] ⚠️  No auth token provided, but proceeding (Apple may not send token for this endpoint)`);
      // Don't return 401 - Apple expects this endpoint to work
      // Some implementations allow this endpoint without auth since it's device-level
    } else {
      console.log(`[${timestamp}]    Auth token: ${authToken.substring(0, 8)}...`);
    }

    // Get registered passes for this device
    const supabase = await createClient();
    const { data: registrations, error } = await supabase
      .from('pass_registrations')
      .select('serial_number')
      .eq('device_library_identifier', deviceLibraryIdentifier)
      .eq('pass_type_identifier', passTypeIdentifier);

    if (error) {
      console.error(`[${timestamp}] ❌ Error fetching registrations:`, error);
      // If table doesn't exist yet, return empty dictionary (Apple expects 200 with JSON)
      return NextResponse.json({ serialNumbers: [] }, { status: 200 });
    }

    const serialNumbers = registrations?.map(r => r.serial_number) || [];
    
    // For "What changed?" requests, we need to include lastUpdated timestamp
    let response: { serialNumbers: string[]; lastUpdated?: string } = { serialNumbers };
    
    if (isWhatChangedRequest && serialNumbers.length > 0) {
      // Get the most recent updated_at timestamp from profiles for these passes
      // Use service role client to bypass RLS
      const serviceSupabase = createServiceRoleClient();
      const { data: profiles, error: profilesError } = await serviceSupabase
        .from('profiles')
        .select('id')
        .in('id', serialNumbers);
      
      if (!profilesError && profiles && profiles.length > 0) {
        // Get the most recent updated_at from the profiles
        // Since profiles table doesn't have updated_at, we'll use current time
        // In a real scenario, you'd track when passes were last updated
        const lastUpdated = new Date().toISOString();
        response.lastUpdated = lastUpdated;
        console.log(`[${timestamp}] ✅ Added lastUpdated: ${lastUpdated}`);
      } else {
        // Fallback: use current time if we can't fetch profile timestamps
        response.lastUpdated = new Date().toISOString();
        console.log(`[${timestamp}] ⚠️  Using current time as lastUpdated (could not fetch profile timestamps)`);
      }
    }
    
    console.log(`[${timestamp}] ✅ Returning ${serialNumbers.length} serial number(s) for device ${deviceLibraryIdentifier}`);
    if (serialNumbers.length > 0) {
      console.log(`[${timestamp}]    Serial numbers: ${serialNumbers.join(', ')}`);
    }
    if (response.lastUpdated) {
      console.log(`[${timestamp}]    lastUpdated: ${response.lastUpdated}`);
    }
    
    // Apple expects a dictionary with 'serialNumbers' key (and 'lastUpdated' for "What changed?" requests)
    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('❌ Error in device registrations GET:', error);
    return NextResponse.json({ serialNumbers: [] }, { status: 200 }); // Apple expects 200 even on error
  }
}


