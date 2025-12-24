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
    
    // Apple requires lastUpdated when returning serial numbers in "What changed?" requests
    // We'll always include it when there are serial numbers to avoid the error
    let response: { serialNumbers: string[]; lastUpdated?: string } = { serialNumbers };
    
    // Include lastUpdated if this is a "What changed?" request OR if we have serial numbers
    // (Apple may send "What changed?" requests without the query parameter in some cases)
    if (serialNumbers.length > 0) {
      // Use current time as lastUpdated
      // In a production system, you'd track the actual last update time per pass
      const lastUpdated = new Date().toISOString();
      response.lastUpdated = lastUpdated;
      
      if (isWhatChangedRequest) {
        console.log(`[${timestamp}] ✅ Added lastUpdated for "What changed?" request: ${lastUpdated}`);
      } else {
        console.log(`[${timestamp}] ✅ Added lastUpdated (preventive): ${lastUpdated}`);
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


