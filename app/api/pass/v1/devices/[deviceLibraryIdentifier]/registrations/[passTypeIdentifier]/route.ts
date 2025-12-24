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
  { params }: { params: { deviceLibraryIdentifier: string; passTypeIdentifier: string } }
) {
  try {
    const { deviceLibraryIdentifier, passTypeIdentifier } = params;
    
    // Validate authentication token from Apple
    const authToken = req.headers.get('authorization')?.replace('ApplePass ', '');
    if (!authToken) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get registered passes for this device
    const supabase = await createClient();
    const { data: registrations, error } = await supabase
      .from('pass_registrations')
      .select('serial_number')
      .eq('device_library_identifier', deviceLibraryIdentifier)
      .eq('pass_type_identifier', passTypeIdentifier);

    if (error) {
      console.error('Error fetching registrations:', error);
      // If table doesn't exist yet, return empty array (Apple expects 200 with JSON)
      return NextResponse.json([], { status: 200 });
    }

    const serialNumbers = registrations?.map(r => r.serial_number) || [];
    
    return NextResponse.json(serialNumbers, { status: 200 });
  } catch (error: any) {
    console.error('Error in device registrations GET:', error);
    return NextResponse.json([], { status: 200 }); // Apple expects 200 even on error
  }
}


