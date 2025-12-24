import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/pass/v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}
 * 
 * Returns list of serial numbers for passes registered to this device
 * Called by Apple when device checks for updates
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
      // If table doesn't exist yet, return empty dictionary (Apple expects a dictionary, not an array)
      return NextResponse.json({}, { status: 200 });
    }

    const serialNumbers = registrations?.map(r => r.serial_number) || [];
    
    console.log(`[${timestamp}] ✅ Returning ${serialNumbers.length} serial number(s) for device ${deviceLibraryIdentifier}`);
    if (serialNumbers.length > 0) {
      console.log(`[${timestamp}]    Serial numbers: ${serialNumbers.join(', ')}`);
      // When there are registrations, return array of serial numbers
      return NextResponse.json(serialNumbers, { status: 200 });
    } else {
      // When there are no registrations, return empty dictionary (Apple PassKit spec requirement)
      return NextResponse.json({}, { status: 200 });
    }
  } catch (error: any) {
    console.error('❌ Error in device registrations GET:', error);
    return NextResponse.json({}, { status: 200 }); // Apple expects 200 with empty dictionary on error
  }
}


