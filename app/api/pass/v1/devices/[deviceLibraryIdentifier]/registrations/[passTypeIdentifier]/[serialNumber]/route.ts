import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/pass/v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}
 * 
 * Registers a pass with a device
 * Called by Apple when user adds pass to Wallet
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ deviceLibraryIdentifier: string; passTypeIdentifier: string; serialNumber: string }> }
) {
  try {
    const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = await params;
    
    // Log with timestamp for debugging
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 📱 Registration attempt for pass ${serialNumber}`);
    console.log(`[${timestamp}]    Device: ${deviceLibraryIdentifier}`);
    console.log(`[${timestamp}]    Pass Type: ${passTypeIdentifier}`);
    console.log(`[${timestamp}]    URL: ${req.url}`);
    console.log(`[${timestamp}]    Method: ${req.method}`);
    
    // Get push token from request body
    const body = await req.text();
    const pushToken = body.trim();
    console.log(`   Push Token: ${pushToken ? 'Present' : 'Missing'}`);

    // Validate authentication token
    const authToken = req.headers.get('authorization')?.replace('ApplePass ', '');
    if (!authToken) {
      console.error('❌ Registration failed: No auth token provided');
      return new NextResponse('Unauthorized', { status: 401 });
    }
    console.log(`   Auth Token: ${authToken.substring(0, 8)}...`);

    // Store registration in database
    const supabase = await createClient();
    
    // First, ensure the table exists (we'll create it via migration, but handle gracefully)
    const { error: insertError } = await supabase
      .from('pass_registrations')
      .upsert({
        device_library_identifier: deviceLibraryIdentifier,
        pass_type_identifier: passTypeIdentifier,
        serial_number: serialNumber,
        push_token: pushToken || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'device_library_identifier,pass_type_identifier,serial_number'
      });

    if (insertError) {
      console.error('❌ Error storing registration:', insertError);
      // If table doesn't exist, log but return success (we'll create table later)
      console.log('⚠️  pass_registrations table may not exist yet. Create it with a migration.');
      return new NextResponse('Created', { status: 201 });
    }

    console.log(`✅ Pass registered successfully: ${serialNumber} on device ${deviceLibraryIdentifier}`);
    console.log(`   Registration stored in database`);
    return new NextResponse('Created', { status: 201 });
  } catch (error: any) {
    console.error('❌ Error in device registration POST:', error);
    console.error('   Stack:', error.stack);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * DELETE /api/pass/v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}
 * 
 * Unregisters a pass from a device
 * Called by Apple when user removes pass from Wallet
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ deviceLibraryIdentifier: string; passTypeIdentifier: string; serialNumber: string }> }
) {
  try {
    const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = await params;

    // Validate authentication token
    const authToken = req.headers.get('authorization')?.replace('ApplePass ', '');
    if (!authToken) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Remove registration from database
    const supabase = await createClient();
    const { error } = await supabase
      .from('pass_registrations')
      .delete()
      .eq('device_library_identifier', deviceLibraryIdentifier)
      .eq('pass_type_identifier', passTypeIdentifier)
      .eq('serial_number', serialNumber);

    if (error) {
      console.error('Error deleting registration:', error);
      // Return success even if not found (idempotent)
      return new NextResponse('OK', { status: 200 });
    }

    console.log(`✅ Pass unregistered: ${serialNumber} from device ${deviceLibraryIdentifier}`);
    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    console.error('Error in device registration DELETE:', error);
    return new NextResponse('OK', { status: 200 }); // Idempotent - return success
  }
}

