import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/pass/giftcard/v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}
 * 
 * Registers a gift card pass with a device
 * Called by Apple when user adds gift card pass to Wallet
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ deviceLibraryIdentifier: string; passTypeIdentifier: string; serialNumber: string }> }
) {
  try {
    const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = await params;
    
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] 💳 Gift card registration attempt for pass ${serialNumber}`);
    console.log(`[${timestamp}]    Device: ${deviceLibraryIdentifier}`);
    console.log(`[${timestamp}]    Pass Type: ${passTypeIdentifier}`);
    console.log(`[${timestamp}]    Full URL: ${req.url}`);
    console.log(`[${timestamp}]    Method: ${req.method}`);
    console.log(`[${timestamp}]    Headers:`, Object.fromEntries(req.headers.entries()));
    
    // Get push token from request body
    const body = await req.text();
    let pushToken = body.trim();
    
    // If it's JSON, parse it and extract the token
    if (pushToken.startsWith('{')) {
      try {
        const parsed = JSON.parse(pushToken);
        pushToken = parsed.pushToken || parsed.push_token || pushToken;
      } catch (e) {
        console.log(`   Warning: Could not parse push token JSON, using as-is`);
      }
    }
    
    console.log(`   Push Token: ${pushToken ? 'Present' : 'Missing'}`);
    if (pushToken) {
      console.log(`   Push Token (first 20 chars): ${pushToken.substring(0, 20)}...`);
    }

    // Validate authentication token
    const authToken = req.headers.get('authorization')?.replace('ApplePass ', '');
    if (!authToken) {
      console.error('❌ Registration failed: No auth token provided');
      console.error('   Available headers:', Object.keys(req.headers));
      return new NextResponse('Unauthorized', { status: 401 });
    }
    console.log(`   Auth Token: ${authToken.substring(0, 8)}...`);

    // Store registration in database
    const supabase = createServiceRoleClient();
    
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
      console.error(`[${timestamp}] ❌ Error storing gift card registration:`, insertError);
      console.error(`[${timestamp}]    Error details:`, insertError.message);
      return new NextResponse('Created', { status: 201 });
    }

    console.log(`[${timestamp}] ✅ Gift card pass registered successfully: ${serialNumber} on device ${deviceLibraryIdentifier}`);
    console.log(`[${timestamp}]    Registration stored in database`);
    console.log(`[${timestamp}]    Push token: ${pushToken ? 'Present' : 'Missing'}`);
    return new NextResponse('Created', { status: 201 });
  } catch (error: any) {
    console.error('❌ Error in gift card device registration POST:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

/**
 * DELETE /api/pass/giftcard/v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}
 * 
 * Unregisters a gift card pass from a device
 * Called by Apple when user removes gift card pass from Wallet
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
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from('pass_registrations')
      .delete()
      .eq('device_library_identifier', deviceLibraryIdentifier)
      .eq('pass_type_identifier', passTypeIdentifier)
      .eq('serial_number', serialNumber);

    if (error) {
      console.error('Error deleting gift card registration:', error);
      return new NextResponse('OK', { status: 200 });
    }

    console.log(`✅ Gift card pass unregistered: ${serialNumber} from device ${deviceLibraryIdentifier}`);
    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    console.error('Error in gift card device registration DELETE:', error);
    return new NextResponse('OK', { status: 200 });
  }
}
