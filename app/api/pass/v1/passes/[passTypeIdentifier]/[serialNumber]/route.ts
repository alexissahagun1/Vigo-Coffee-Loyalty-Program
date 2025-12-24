import { NextRequest, NextResponse } from 'next/server';
import { PKPass } from 'passkit-generator';
import { createClient } from '@/lib/supabase/server';
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
    const { passTypeIdentifier, serialNumber } = await params;
    
    // Validate authentication token
    const authToken = req.headers.get('authorization')?.replace('ApplePass ', '');
    if (!authToken) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get If-Modified-Since header to check if update is needed
    const ifModifiedSince = req.headers.get('if-modified-since');
    
    // Fetch current user data (serialNumber is the user ID)
    const supabase = await createClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', serialNumber)
      .single();

    if (profileError || !profile) {
      console.error('Profile not found for serial number:', serialNumber);
      return new NextResponse('Not Found', { status: 404 });
    }

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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
      'http://localhost:3000';
    
    // Prepare pass.json properties with webServiceURL
    const passJsonProps: any = {
      passTypeIdentifier: passTypeIdentifier,
      teamIdentifier: process.env.APPLE_TEAM_ID || '',
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
    const pass = new PKPass(
      {},
      {
        signerCert: Buffer.from(process.env.APPLE_PASS_CERT_BASE64, 'base64'),
        signerKey: Buffer.from(process.env.APPLE_PASS_KEY_BASE64 || process.env.APPLE_PASS_CERT_BASE64, 'base64'),
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

    let rewardMessage = null;
    let rewardLabel = null;

    if (points >= POINTS_FOR_MEAL && points % POINTS_FOR_MEAL === 0) {
      rewardMessage = '🎉 You earned a FREE MEAL! 🍽️';
      rewardLabel = 'You just earned a reward!';
    } else if (points >= POINTS_FOR_COFFEE && points % POINTS_FOR_COFFEE === 0) {
      rewardMessage = '🎉 You earned a FREE COFFEE! ☕️';
      rewardLabel = 'You just earned a reward!';
    } else {
      rewardMessage = 'No reward yet! Keep shopping, you are almost there!';
      rewardLabel = 'KEEP GOING';
    }

    pass.headerFields.push({
      key: 'balance',
      label: 'BALANCE',
      value: profile.points_balance + ' pts',
      textAlignment: 'PKTextAlignmentRight'
    });

    pass.secondaryFields.push({
      key: 'member',
      label: 'MEMBER',
      value: profile.full_name || 'Valued Customer',
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

