import { NextRequest, NextResponse } from 'next/server';
import { PKPass } from 'passkit-generator';
import { createClient } from '@/lib/supabase/server';
import { readFileSync } from 'fs'
import { join } from 'path'
import sharp from 'sharp';
import { generateLoyaltyCardBackground } from '@/lib/loyalty-card/generate-background';
import { generateAuthToken } from '@/lib/passkit/auth-token';


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
  if (!process.env.APPLE_PASS_CERT_BASE64 || !process.env.APPLE_PASS_KEY_BASE64 || !process.env.APPLE_WWDR_CERT_BASE64) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Apple Pass certificates not configured',
        debug: {
          hasCert: !!process.env.APPLE_PASS_CERT_BASE64,
          certLength: process.env.APPLE_PASS_CERT_BASE64?.length || 0,
          hasKey: !!process.env.APPLE_PASS_KEY_BASE64,
          keyLength: process.env.APPLE_PASS_KEY_BASE64?.length || 0,
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

  // Load image assets
  let logoBuffer: Buffer | undefined;
  let redTigerBuffer: Buffer | undefined;
  let whiteTigerBuffer: Buffer | undefined;
  
  try {
    const logoPath = join(process.cwd(), 'public', 'logo.png');
    logoBuffer = readFileSync(logoPath);
  } catch (error) {
    console.error('Failed to load logo:', error);
  }

  try {
    const redTigerPath = join(process.cwd(), 'public', 'tiger-red.png');
    redTigerBuffer = readFileSync(redTigerPath);
    console.log('✅ Red tiger loaded:', redTigerBuffer.length, 'bytes');
  } catch (error) {
    console.error('❌ Failed to load red tiger:', error);
  }

  try {
    const whiteTigerPath = join(process.cwd(), 'public', 'tiger-white.png');
    whiteTigerBuffer = readFileSync(whiteTigerPath);
    console.log('✅ White tiger loaded:', whiteTigerBuffer.length, 'bytes');
  } catch (error) {
    console.error('❌ Failed to load white tiger:', error);
  }

  // 3. Configure Web Service URL for Real-Time Updates
  // This must be set in pass.json to enable "Automatic Updates" toggle
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
    'http://localhost:3000');
  
  // Ensure baseUrl has protocol (https:// or http://)
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }
  
  // Prepare pass.json properties
  const passJsonProps: any = {
    // Pass.json properties - these are REQUIRED by Apple
    passTypeIdentifier: process.env.PASS_TYPE_ID || 'pass.com.vigocoffee.loyalty',
    teamIdentifier: process.env.APPLE_TEAM_ID || '',
    organizationName: 'Vigo Coffee',
    description: 'Vigo Coffee Loyalty Card',
    serialNumber: user.id,
    formatVersion: 1,
    backgroundColor: 'rgb(0, 0, 0)', // Should match the background image
    foregroundColor: 'rgb(255, 255, 255)',
    labelColor: 'rgb(200, 200, 200)'
  };

  // Add webServiceURL and authenticationToken
  // These MUST be in pass.json for the toggles to appear and for device registration
  // Note: On localhost, Apple's servers cannot reach the URL, so automatic updates won't work
  // but the pass will still register, allowing updates to work once deployed to production
  passJsonProps.webServiceURL = `${baseUrl}/api/pass`;
  passJsonProps.authenticationToken = generateAuthToken(user.id);
  console.log('✅ Web service URL configured:', passJsonProps.webServiceURL);
  console.log('✅ Authentication token generated for user:', user.id);
  
  if (baseUrl === 'http://localhost:3000') {
    console.log('⚠️  Running on localhost - Apple servers cannot reach this URL');
    console.log('   Automatic updates will not work until deployed to production');
    console.log('   Re-download the pass to see updated points during development');
  }

  // Initialize the Pass
  // We decode the Base64 keys back to Buffers here
  // IMPORTANT: signerKey must be the private key, NOT the certificate
  // Using the certificate as the key will cause Apple Wallet to reject the pass
  const pass = new PKPass(
    {}, // FileBuffers - not loading from files
    {
      signerCert: Buffer.from(process.env.APPLE_PASS_CERT_BASE64, 'base64'),
      signerKey: Buffer.from(process.env.APPLE_PASS_KEY_BASE64, 'base64'),
      wwdr: Buffer.from(process.env.APPLE_WWDR_CERT_BASE64, 'base64'),
      signerKeyPassphrase: process.env.APPLE_PASS_PASSWORD
    },
    passJsonProps
  );

  // Add images
  if (logoBuffer) {
    pass.addBuffer('logo.png', logoBuffer);
    pass.addBuffer('icon.png', logoBuffer);
  }

  // Generate and add dynamic background image with tigers
  // Note: storeCard passes support both background and strip images
  // We'll add both to ensure visibility
  if (logoBuffer && redTigerBuffer && whiteTigerBuffer) {
    try {
      const backgroundBuffer = await generateLoyaltyCardBackground(
        finalProfile.points_balance,
        logoBuffer,
        redTigerBuffer,
        whiteTigerBuffer
      );
      
      // Add as background image (for full card background)
      pass.addBuffer('background.png', backgroundBuffer);
      pass.addBuffer('background@2x.png', backgroundBuffer);
      
      // Also add as strip image (displays prominently at top of storeCard)
      // Strip dimensions: 1125x432 points (@2x: 2250x864 pixels)
      // Extract just the top section with tigers for the strip
      const backgroundMetadata = await sharp(backgroundBuffer).metadata();
      const topSectionHeight = Math.floor((backgroundMetadata.height || 234) * 0.6); // Match the top section from background
      const stripBuffer = await sharp(backgroundBuffer)
        .extract({ 
          left: 0, 
          top: 0, 
          width: backgroundMetadata.width || 390, 
          height: topSectionHeight 
        })
        .resize(1125, 432, { 
          fit: 'cover',
          position: 'top'
        })
        .png()
        .toBuffer();
      
      pass.addBuffer('strip.png', stripBuffer);
      pass.addBuffer('strip@2x.png', stripBuffer);
      
      console.log('✅ Background and strip images generated successfully');
      console.log('  Background size:', backgroundBuffer.length, 'bytes');
      console.log('  Strip size:', stripBuffer.length, 'bytes');
    } catch (error: any) {
      console.error('⚠️ Failed to generate background image:', error?.message || error);
      console.error('Stack trace:', error?.stack);
      console.error('The pass will be generated without custom background.');
      // Continue without background if generation fails - pass will still work
    }
  } else {
    console.error('❌ Missing image buffers:', {
      hasLogo: !!logoBuffer,
      hasRedTiger: !!redTigerBuffer,
      hasWhiteTiger: !!whiteTigerBuffer
    });
  }

  pass.type = 'storeCard';
  
  // Check if customer is at reward milestone
  const points = finalProfile.points_balance || 0;
  const POINTS_FOR_COFFEE = 10;
  const POINTS_FOR_MEAL = 25;

  // Get redeemed rewards with proper null/type safety
  const redeemedRewards = finalProfile.redeemed_rewards || { coffees: [], meals: [] };
  // Ensure arrays exist and convert to numbers (JSONB might return strings)
  const redeemedCoffees = Array.isArray(redeemedRewards.coffees) 
    ? redeemedRewards.coffees.map(Number).filter((n: number) => !isNaN(n))
    : [];
  const redeemedMeals = Array.isArray(redeemedRewards.meals)
    ? redeemedRewards.meals.map(Number).filter((n: number) => !isNaN(n))
    : [];

  let rewardMessage = null;
  let rewardEarned = false;
  let rewardLabel = null;

  // Ensure points is a number for comparison
  const currentPoints = Number(points) || 0;

  // Check meal first (higher value reward) - only show if not redeemed
  if (currentPoints >= POINTS_FOR_MEAL && currentPoints % POINTS_FOR_MEAL === 0 && !redeemedMeals.includes(currentPoints)) {
    rewardEarned = true;
    rewardMessage = '🎉 You earned a FREE MEAL! 🍽️';
    rewardLabel = 'You just earned a reward!';
  }
  // Then check coffee - only show if not redeemed
  else if (currentPoints >= POINTS_FOR_COFFEE && currentPoints % POINTS_FOR_COFFEE === 0 && !redeemedCoffees.includes(currentPoints)) {
    rewardEarned = true;
    rewardMessage = '🎉 You earned a FREE COFFEE! ☕️';
    rewardLabel = 'You just earned a reward!';
  }
  // No reward yet - show motivational message
  else {
    rewardMessage = 'No reward yet! Keep shopping, you are almost there!';
    rewardLabel = 'KEEP GOING';
  }

  // Balance in top right corner (like airline flight numbers) - headerFields
  // Ensure points_balance is a valid number - Apple Wallet rejects null/undefined in string concatenation
  const pointsBalance = Number(finalProfile.points_balance) || 0;
  pass.headerFields.push({
    key: 'balance',
    label: 'BALANCE',
    value: `${pointsBalance} pts`,
    textAlignment: 'PKTextAlignmentRight'
  });

  // Row 1: Member name (medium text in secondaryFields)
  // Ensure we have a valid non-empty string - Apple Wallet rejects empty strings
  // The || operator doesn't catch empty strings, so we need to explicitly check and trim
  let memberName = finalProfile.full_name?.trim() || user.email?.trim() || 'Valued Customer';
  memberName = memberName.trim(); // Final trim to ensure no whitespace-only strings
  if (!memberName) {
    // Fallback if somehow all are empty (shouldn't happen, but safety check)
    memberName = 'Valued Customer';
  }
  pass.secondaryFields.push({
    key: 'member',
    label: 'MEMBER',
    value: memberName,
    textAlignment: 'PKTextAlignmentLeft'
  });

  // Row 2: Keep Going / Reward (auxiliaryFields - each on its own row)
  if (rewardMessage) {
    pass.auxiliaryFields.push({
      key: 'rewardLabel',
      label: rewardLabel,
      value: rewardMessage,
      textAlignment: 'PKTextAlignmentLeft'
    });
  }

  // Add reward structure to backFields (pass details when clicking three dots)
  pass.backFields.push({
    key: 'rewardStructure',
    label: 'Reward Structure',
    value: '25 stamps = meal, 10 stamps = coffee'
  });

  // 4. Add Barcode (The Barista scans this!)
  // Using the user's UUID allows you to look them up instantly
  pass.setBarcodes({
    format: 'PKBarcodeFormatQR',
    message: user.id, 
    messageEncoding: 'iso-8859-1'
  });

  // 5. Debug: Log pass contents before generation
  const passAny = pass as any;
  console.log('📋 Pass configuration:', {
    type: pass.type,
    headerFieldsCount: pass.headerFields?.length || 0,
    secondaryFieldsCount: pass.secondaryFields?.length || 0,
    auxiliaryFieldsCount: pass.auxiliaryFields?.length || 0,
    backFieldsCount: pass.backFields?.length || 0,
    hasBarcode: !!(passAny.barcodes?.length),
    headerFields: pass.headerFields?.map((f: any) => ({ key: f.key, label: f.label, value: String(f.value).substring(0, 50) })),
    secondaryFields: pass.secondaryFields?.map((f: any) => ({ key: f.key, label: f.label, value: String(f.value).substring(0, 50) })),
    auxiliaryFields: pass.auxiliaryFields?.map((f: any) => ({ key: f.key, label: f.label, value: String(f.value).substring(0, 50) }))
  });
  
  // Also try to inspect the pass structure if possible
  try {
    // Check if pass has the expected structure
    if (passAny.passJson) {
      const passJson = passAny.passJson;
      console.log('📋 Pass.json structure:', {
        passTypeIdentifier: passJson.passTypeIdentifier,
        serialNumber: passJson.serialNumber,
        hasWebServiceURL: !!passJson.webServiceURL,
        hasAuthenticationToken: !!passJson.authenticationToken,
        storeCardFields: {
          headerFields: passJson.storeCard?.headerFields?.length || 0,
          secondaryFields: passJson.storeCard?.secondaryFields?.length || 0,
          auxiliaryFields: passJson.storeCard?.auxiliaryFields?.length || 0,
          backFields: passJson.storeCard?.backFields?.length || 0
        },
        images: Object.keys(passJson.images || {})
      });
    }
  } catch (e: any) {
    console.log('⚠️ Could not inspect pass.json structure:', e?.message);
  }

  // 6. Generate and Serve the File
  try {
    console.log('🔄 Generating pass buffer...');
    const buffer = pass.getAsBuffer();
    console.log('✅ Pass generated successfully, size:', buffer.length, 'bytes');
    
    // Validate buffer is not empty
    if (!buffer || buffer.length === 0) {
      throw new Error('Generated pass buffer is empty');
    }
    
    // Validate it's a valid PKPass file (should start with PK or be a ZIP)
    const bufferStart = buffer.subarray(0, 2);
    const isZip = bufferStart[0] === 0x50 && bufferStart[1] === 0x4B; // PK (ZIP signature)
    if (!isZip) {
      console.warn('⚠️ Pass buffer does not appear to be a valid ZIP file');
    }
    
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': 'attachment; filename=loyalty-card.pkpass',
      },
    });
  } catch (error: any) {
    console.error('❌ Error generating pass:', error);
    console.error('Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      stack: error?.stack?.split('\n').slice(0, 5).join('\n')
    });
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to generate pass', 
        details: error?.message,
        code: error?.code,
        name: error?.name
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
