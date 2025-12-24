import { NextRequest, NextResponse } from 'next/server';
import { PKPass } from 'passkit-generator';
import { createClient } from '@/lib/supabase/server';
import { readFileSync } from 'fs'
import { join } from 'path'


export async function GET(req: NextRequest) {
  // Debug: Check environment variables
  console.log('=== DEBUG: Environment Variables ===');
  console.log('APPLE_PASS_CERT_BASE64 exists:', !!process.env.APPLE_PASS_CERT_BASE64);
  console.log('APPLE_PASS_CERT_BASE64 length:', process.env.APPLE_PASS_CERT_BASE64?.length || 0);
  console.log('APPLE_PASS_CERT_BASE64 first 20 chars:', process.env.APPLE_PASS_CERT_BASE64?.substring(0, 20) || 'N/A');
  console.log('APPLE_PASS_KEY_BASE64 exists:', !!process.env.APPLE_PASS_KEY_BASE64);
  console.log('APPLE_PASS_KEY_BASE64 length:', process.env.APPLE_PASS_KEY_BASE64?.length || 0);
  console.log('APPLE_PASS_KEY_BASE64 first 20 chars:', process.env.APPLE_PASS_KEY_BASE64?.substring(0, 20) || 'N/A');
  console.log('APPLE_WWDR_CERT_BASE64 exists:', !!process.env.APPLE_WWDR_CERT_BASE64);
  console.log('APPLE_WWDR_CERT_BASE64 length:', process.env.APPLE_WWDR_CERT_BASE64?.length || 0);
  console.log('APPLE_WWDR_CERT_BASE64 first 20 chars:', process.env.APPLE_WWDR_CERT_BASE64?.substring(0, 20) || 'N/A');
  console.log('PASS_TYPE_ID:', process.env.PASS_TYPE_ID || 'NOT SET');
  console.log('APPLE_TEAM_ID:', process.env.APPLE_TEAM_ID || 'NOT SET');
  console.log('====================================');

  // 0. Validate required environment variables first
  if (!process.env.APPLE_PASS_CERT_BASE64 || !process.env.APPLE_WWDR_CERT_BASE64) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Apple Pass certificates not configured',
        debug: {
          hasCert: !!process.env.APPLE_PASS_CERT_BASE64,
          certLength: process.env.APPLE_PASS_CERT_BASE64?.length || 0,
          hasWwdr: !!process.env.APPLE_WWDR_CERT_BASE64,
          wwdrLength: process.env.APPLE_WWDR_CERT_BASE64?.length || 0,
        }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 1. Authenticate User
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  // 2. Fetch User Data (Points)
  // According to Supabase docs: .single() returns status 406 (PGRST116) when no row found
  const { data: profile, error: profileError, status } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // If profile doesn't exist (status 406) or other error, create it
  // Status 406 means "not found" which is expected for new users
  if (profileError && status !== 406) {
    // Actual error (not just "not found")
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch profile', details: profileError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let finalProfile = profile;

  // Create profile if it doesn't exist (status 406 or no data)
  if (!finalProfile || status === 406) {
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({ id: user.id, points_balance: 0, total_purchases: 0 })
      .select()
      .single();
    
    if (createError || !newProfile) {
      return new NextResponse(
        JSON.stringify({ error: 'Failed to create profile', details: createError?.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    finalProfile = newProfile;
  }

  let logoBuffer: Buffer | undefined;
  try {
    const logoPath = join(process.cwd(), 'public', 'logo.png');
    logoBuffer = readFileSync(logoPath);
  } catch (error) {
    console.error('Failed to load logo:', error); // continue without logo if file doesnt exist
  }

  // 3. Initialize the Pass
  // We decode the Base64 keys back to Buffers here
  const pass = new PKPass(
    {}, // FileBuffers - not loading from files
    {
      signerCert: Buffer.from(process.env.APPLE_PASS_CERT_BASE64, 'base64'),
      signerKey: Buffer.from(process.env.APPLE_PASS_KEY_BASE64 || process.env.APPLE_PASS_CERT_BASE64, 'base64'),
      wwdr: Buffer.from(process.env.APPLE_WWDR_CERT_BASE64, 'base64'),
      signerKeyPassphrase: process.env.APPLE_PASS_PASSWORD
    },
    {
      // Pass.json properties - these are REQUIRED by Apple
      passTypeIdentifier: process.env.PASS_TYPE_ID || 'pass.com.vigocoffee.loyalty',
      teamIdentifier: process.env.APPLE_TEAM_ID || '',
      organizationName: 'Vigo Coffee',
      description: 'Vigo Coffee Loyalty Card',
      serialNumber: user.id,
      formatVersion: 1,
      backgroundColor: 'rgb(60, 60, 60)',
      foregroundColor: 'rgb(255, 255, 255)',
      labelColor: 'rgb(200, 200, 200)'
    }
  );

  // Add images
  if (logoBuffer) {
    pass.addBuffer('logo.png', logoBuffer);
    pass.addBuffer('icon.png', logoBuffer);
  }

  pass.type = 'storeCard';
  pass.primaryFields.push({
    key: 'balance',
    label: 'BALANCE',
    value: finalProfile.points_balance + ' pts',
    textAlignment: 'PKTextAlignmentRight'
  });

  // Check if customer is at reward milestone
  const points = finalProfile.points_balance || 0;
  const POINTS_FOR_COFFEE = 10;
  const POINTS_FOR_MEAL = 25;

  let rewardMessage = null;

  // Check meal first (higher value reward)
  if (points >= POINTS_FOR_MEAL && points % POINTS_FOR_MEAL === 0) {
    rewardMessage = '🎉 You earned a FREE MEAL! 🍽️';
  }
  // Then check coffee
  else if (points >= POINTS_FOR_COFFEE && points % POINTS_FOR_COFFEE === 0) {
    rewardMessage = '🎉 You earned a FREE COFFEE! ☕️';
  }
  else {
    rewardMessage = '🎉 No reward yet! Keep shopping, you are almost there! 🛒';
  }

  // Add reward message to pass only if earned
  if (rewardMessage) {
    pass.auxiliaryFields.push({
      key: 'reward',
      label: 'You just earned a reward!',
      value: rewardMessage,
      textAlignment: 'PKTextAlignmentCenter'
    });
  }


  pass.secondaryFields.push({
    key: 'member',
    label: 'MEMBER',
    value: finalProfile.full_name || user.email || 'Valued Customer'
  });

  // 4. Add Barcode (The Barista scans this!)
  // Using the user's UUID allows you to look them up instantly
  pass.setBarcodes({
    format: 'PKBarcodeFormatQR',
    message: user.id, 
    messageEncoding: 'iso-8859-1'
  });

  // 5. Generate and Serve the File
  try {
    const buffer = pass.getAsBuffer();
    console.log('✅ Pass generated successfully, size:', buffer.length, 'bytes');
    
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': 'attachment; filename=loyalty-card.pkpass',
      },
    });
  } catch (error: any) {
    console.error('❌ Error generating pass:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to generate pass', 
        details: error?.message,
        stack: error?.stack 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
