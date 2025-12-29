import { NextRequest, NextResponse } from 'next/server';
import { PKPass } from 'passkit-generator';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { generateLoyaltyCardBackground } from '@/lib/loyalty-card/generate-background';
import { generateAuthToken } from '@/lib/passkit/auth-token';

/**
 * GET /api/pass/v1/passes/{passTypeIdentifier}/{serialNumber}
 * 
 * Returns the latest version of a pass
 * Called by Apple when checking for updates or after push notification
 * 
 * This endpoint regenerates the pass with current data from the database
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ passTypeIdentifier: string; serialNumber: string }> }
) {
  try {
    // Validate required environment variables first
    if (!process.env.APPLE_PASS_CERT_BASE64 || !process.env.APPLE_PASS_KEY_BASE64 || !process.env.APPLE_WWDR_CERT_BASE64) {
      console.error('❌ Apple Pass certificates not configured');
      return new NextResponse(
        JSON.stringify({ error: 'Apple Pass certificates not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { passTypeIdentifier, serialNumber } = await params;
    
    console.log(`📱 Apple fetching pass update for serial: ${serialNumber}`);
    console.log(`   Pass Type: ${passTypeIdentifier}`);
    
    // Validate authentication token
    const authToken = req.headers.get('authorization')?.replace('ApplePass ', '');
    if (!authToken) {
      console.error(`❌ No auth token provided for pass ${serialNumber}`);
      return new NextResponse('Unauthorized', { status: 401 });
    }
    console.log(`   Auth token: ${authToken.substring(0, 8)}...`);

    // Get If-Modified-Since header to check if update is needed
    const ifModifiedSince = req.headers.get('if-modified-since');
    
    // Fetch current user data (serialNumber is the user ID)
    // Use service role client because Apple's servers don't have authentication cookies
    console.log(`🔍 Fetching profile for user: ${serialNumber}`);
    const supabase = createServiceRoleClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', serialNumber)
      .single();

    if (profileError) {
      console.error(`❌ Database error fetching profile:`, profileError);
      return new NextResponse('Not Found', { status: 404 });
    }
    
    if (!profile) {
      console.error(`❌ Profile not found for serial number: ${serialNumber}`);
      return new NextResponse('Not Found', { status: 404 });
    }
    
    console.log(`✅ Profile found: ${profile.full_name}, Points: ${profile.points_balance}`);

    // Check if pass needs update (compare updated_at with If-Modified-Since)
    if (ifModifiedSince && profile.updated_at) {
      const lastModified = new Date(profile.updated_at);
      const ifModified = new Date(ifModifiedSince);
      if (lastModified <= ifModified) {
        // No changes, return 304 Not Modified
        return new NextResponse(null, { status: 304 });
      }
    }

    // Validate required environment variables
    if (!process.env.APPLE_PASS_CERT_BASE64 || !process.env.APPLE_WWDR_CERT_BASE64) {
      return new NextResponse('Server configuration error', { status: 500 });
    }

    // Load image assets
    let logoBuffer: Buffer | undefined;
    let redTigerBuffer: Buffer | undefined;
    let whiteTigerBuffer: Buffer | undefined;
    
    try {
      logoBuffer = readFileSync(join(process.cwd(), 'public', 'logo.png'));
      redTigerBuffer = readFileSync(join(process.cwd(), 'public', 'tiger-red.png'));
      whiteTigerBuffer = readFileSync(join(process.cwd(), 'public', 'tiger-white.png'));
    } catch (error) {
      console.error('Failed to load images:', error);
      return new NextResponse('Server error', { status: 500 });
    }

    // Configure web service URL (must be in pass.json)
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
      'http://localhost:3000');
    
    // Ensure baseUrl has protocol (https:// or http://)
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    // Prepare pass.json properties with webServiceURL
    // Validate required fields - Apple Wallet rejects passes with empty required fields
    const teamIdentifier = process.env.APPLE_TEAM_ID?.trim();
    if (!teamIdentifier) {
      console.error('❌ APPLE_TEAM_ID is required but not set');
      return new NextResponse(
        JSON.stringify({ error: 'Apple Team ID not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const passJsonProps: any = {
      passTypeIdentifier: passTypeIdentifier,
      teamIdentifier: teamIdentifier, // Must be non-empty
      organizationName: 'Vigo Coffee',
      description: 'Vigo Coffee Loyalty Card',
      serialNumber: serialNumber,
      formatVersion: 1,
      backgroundColor: 'rgb(0, 0, 0)',
      foregroundColor: 'rgb(255, 255, 255)',
      labelColor: 'rgb(200, 200, 200)'
    };

    // Add webServiceURL and authenticationToken
    // Always set these so the pass can be registered, even on localhost
    // (Note: Apple servers can't reach localhost, so updates won't work until production)
    passJsonProps.webServiceURL = `${baseUrl}/api/pass`;
    passJsonProps.authenticationToken = generateAuthToken(serialNumber);

    // Initialize the Pass (same logic as wallet route)
    // IMPORTANT: signerKey must be the private key, NOT the certificate
    // Using the certificate as the key will cause Apple Wallet to reject the pass
    const pass = new PKPass(
      {},
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

    // Generate background with current points
    if (logoBuffer && redTigerBuffer && whiteTigerBuffer) {
      try {
        const backgroundBuffer = await generateLoyaltyCardBackground(
          profile.points_balance,
          logoBuffer,
          redTigerBuffer,
          whiteTigerBuffer
        );
        
        pass.addBuffer('background.png', backgroundBuffer);
        pass.addBuffer('background@2x.png', backgroundBuffer);
        
        const backgroundMetadata = await sharp(backgroundBuffer).metadata();
        const topSectionHeight = Math.floor((backgroundMetadata.height || 234) * 0.6);
        const stripBuffer = await sharp(backgroundBuffer)
          .extract({ 
            left: 0, 
            top: 0, 
            width: backgroundMetadata.width || 390, 
            height: topSectionHeight 
          })
          .resize(1125, 432, { fit: 'cover', position: 'top' })
          .png()
          .toBuffer();
        
        pass.addBuffer('strip.png', stripBuffer);
        pass.addBuffer('strip@2x.png', stripBuffer);
      } catch (error: any) {
        console.error('Failed to generate background:', error);
      }
    }

    pass.type = 'storeCard';

    // Add pass fields (same as wallet route)
    const points = profile.points_balance || 0;
    const POINTS_FOR_COFFEE = 10;
    const POINTS_FOR_MEAL = 25;

    // Get redeemed rewards with proper null/type safety
    const redeemedRewards = profile.redeemed_rewards || { coffees: [], meals: [] };
    // Ensure arrays exist and convert to numbers (JSONB might return strings)
    const redeemedCoffees = Array.isArray(redeemedRewards.coffees)
      ? redeemedRewards.coffees.map(Number).filter((n: number) => !isNaN(n))
      : [];
    const redeemedMeals = Array.isArray(redeemedRewards.meals)
      ? redeemedRewards.meals.map(Number).filter((n: number) => !isNaN(n))
      : [];

    let rewardMessage = null;
    let rewardLabel = null;

    // Ensure points is a number for comparison
    const currentPoints = Number(points) || 0;

    // Check meal first (higher value reward) - only show if not redeemed
    if (currentPoints >= POINTS_FOR_MEAL && currentPoints % POINTS_FOR_MEAL === 0 && !redeemedMeals.includes(currentPoints)) {
      rewardMessage = '🎉 You earned a FREE MEAL! 🍽️';
      rewardLabel = 'You just earned a reward!';
    } 
    // Then check coffee - only show if not redeemed
    else if (currentPoints >= POINTS_FOR_COFFEE && currentPoints % POINTS_FOR_COFFEE === 0 && !redeemedCoffees.includes(currentPoints)) {
      rewardMessage = '🎉 You earned a FREE COFFEE! ☕️';
      rewardLabel = 'You just earned a reward!';
    } 
    // No reward yet - show motivational message
    else {
      rewardMessage = 'No reward yet! Keep shopping, you are almost there!';
      rewardLabel = 'KEEP GOING';
    }

    // Balance in top right corner - ensure points_balance is a valid number
    const pointsBalance = Number(profile.points_balance) || 0;
    pass.headerFields.push({
      key: 'balance',
      label: 'BALANCE',
      value: `${pointsBalance} pts`,
      textAlignment: 'PKTextAlignmentRight'
    });

    // Member name - ensure we have a valid non-empty string
    let memberName = profile.full_name?.trim() || 'Valued Customer';
    memberName = memberName.trim(); // Final trim to ensure no whitespace-only strings
    if (!memberName) {
      memberName = 'Valued Customer';
    }
    pass.secondaryFields.push({
      key: 'member',
      label: 'MEMBER',
      value: memberName,
      textAlignment: 'PKTextAlignmentLeft'
    });

    if (rewardMessage) {
      pass.auxiliaryFields.push({
        key: 'rewardLabel',
        label: rewardLabel,
        value: rewardMessage,
        textAlignment: 'PKTextAlignmentLeft'
      });
    }

    pass.backFields.push({
      key: 'rewardStructure',
      label: 'Reward Structure',
      value: '25 stamps = meal, 10 stamps = coffee'
    });

    pass.setBarcodes({
      format: 'PKBarcodeFormatQR',
      message: serialNumber,
      messageEncoding: 'iso-8859-1'
    });

    // Generate pass buffer
    const buffer = pass.getAsBuffer();
    
    console.log(`✅ Pass updated for serial number: ${serialNumber}, points: ${points}`);
    
    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Last-Modified': new Date(profile.updated_at || Date.now()).toUTCString(),
      },
    });
  } catch (error: any) {
    console.error('Error generating updated pass:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

