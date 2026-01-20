import { NextRequest, NextResponse } from 'next/server';
import { PKPass } from 'passkit-generator';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { generateGiftCardBackground } from '@/lib/passkit/gift-card-pass-generator';
import { generateAuthToken, validateAuthToken } from '@/lib/passkit/auth-token';

/**
 * GET /api/pass/giftcard/v1/passes/{passTypeIdentifier}/{serialNumber}
 * 
 * Returns the latest version of a gift card pass
 * Called by Apple when checking for updates or after push notification
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ passTypeIdentifier: string; serialNumber: string }> }
) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 💳 GIFT CARD PASS UPDATE ENDPOINT CALLED BY APPLE`);
  console.log(`[${timestamp}] 💳 URL: ${req.url}`);
  
  try {
    // Support separate gift card certificates, with fallback to loyalty card certificates
    const certBase64 = process.env.GIFT_CARD_PASS_CERT_BASE64 || process.env.APPLE_PASS_CERT_BASE64;
    const keyBase64 = process.env.GIFT_CARD_PASS_KEY_BASE64 || process.env.APPLE_PASS_KEY_BASE64;
    const password = process.env.GIFT_CARD_PASS_PASSWORD || process.env.APPLE_PASS_PASSWORD;
    const wwdrCertBase64 = process.env.GIFT_CARD_WWDR_CERT_BASE64 || process.env.APPLE_WWDR_CERT_BASE64;

    // Validate required environment variables
    if (!certBase64 || !keyBase64 || !wwdrCertBase64) {
      console.error(`[${timestamp}] ❌ Apple Pass certificates not configured`);
      return new NextResponse(
        JSON.stringify({ error: 'Apple Pass certificates not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { passTypeIdentifier, serialNumber } = await params;
    
    console.log(`[${timestamp}] 💳 Apple fetching gift card pass update for serial: ${serialNumber}`);
    console.log(`[${timestamp}] 💳    Pass Type: ${passTypeIdentifier}`);
    
    // Validate authentication token
    const authToken = req.headers.get('authorization')?.replace('ApplePass ', '');
    if (!authToken) {
      console.error(`❌ No auth token provided for gift card pass ${serialNumber}`);
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Validate token matches serial number
    if (!validateAuthToken(authToken, serialNumber)) {
      console.error(`❌ Invalid auth token for gift card pass ${serialNumber}`);
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Fetch gift card data (serialNumber is the gift card serial_number)
    console.log(`🔍 Fetching gift card for serial: ${serialNumber}`);
    const supabase = createServiceRoleClient();
    const { data: giftCard, error: giftCardError } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('serial_number', serialNumber)
      .single();
    
    if (giftCard) {
      console.log(`📊 Fetched gift card data:`, {
        id: giftCard.id,
        serial_number: giftCard.serial_number,
        balance_mxn: giftCard.balance_mxn,
        updated_at: giftCard.updated_at,
      });
    }

    if (giftCardError || !giftCard) {
      console.error(`❌ Gift card not found for serial number: ${serialNumber}`);
      return new NextResponse('Not Found', { status: 404 });
    }

    // Check if gift card is active
    if (!giftCard.is_active) {
      console.log(`⚠️ Gift card ${serialNumber} is inactive`);
      // Still return the pass, but it will show inactive status
    }

    // Load logo image
    let logoBuffer: Buffer | undefined;
    try {
      const logoPath = join(process.cwd(), 'public', 'logo.png');
      logoBuffer = readFileSync(logoPath);
    } catch (error) {
      console.error('Failed to load logo:', error);
    }

    // Configure Web Service URL
    // Strategy: Use preview URL for preview deployments (works for testing), production URL for production
    // NOTE: Preview URLs change between deployments - pass will break after redeploy
    // For production, always use NEXT_PUBLIC_APP_URL for stability
    let baseUrl: string;
    const isPreview = process.env.VERCEL_URL?.includes('git-') || process.env.VERCEL_ENV === 'preview';
    
    if (isPreview && process.env.VERCEL_URL) {
      // Preview deployment: Use current preview URL (works for immediate testing)
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
      // Production or fallback: Use stable production URL
      baseUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `https://${baseUrl}`;
      }
    } else if (process.env.VERCEL_URL) {
      // Fallback: Use VERCEL_URL if no production URL set
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else {
      // Local development fallback
      baseUrl = 'http://localhost:3000';
    }

    // Check if URL is publicly accessible (not localhost or local network IP)
    const isPublicUrl = !baseUrl.includes('localhost') && 
                       !baseUrl.includes('127.0.0.1') && 
                       !baseUrl.match(/192\.168\.\d+\.\d+/) &&
                       !baseUrl.match(/10\.\d+\.\d+\.\d+/) &&
                       !baseUrl.match(/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+/);

    const teamIdentifier = process.env.APPLE_TEAM_ID?.trim();
    if (!teamIdentifier) {
      return new NextResponse(
        JSON.stringify({ error: 'Apple Team ID not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const balanceMxn = Number(giftCard.balance_mxn) || 0;

    const passJsonProps: any = {
      passTypeIdentifier: passTypeIdentifier,
      teamIdentifier: teamIdentifier,
      organizationName: 'Vigo Coffee',
      description: 'Vigo Coffee Gift Card',
      serialNumber: giftCard.serial_number,
      formatVersion: 1,
      backgroundColor: 'rgb(0, 0, 0)',
      foregroundColor: 'rgb(255, 255, 255)',
      labelColor: 'rgb(200, 200, 200)'
    };

    // Add webServiceURL and authenticationToken (only if publicly accessible)
    // Apple Wallet rejects passes with localhost or local network IPs in webServiceURL
    if (isPublicUrl) {
      passJsonProps.webServiceURL = `${baseUrl}/api/pass/giftcard`;
      passJsonProps.authenticationToken = generateAuthToken(giftCard.serial_number);
      console.log('✅ Web service URL configured:', passJsonProps.webServiceURL);
    } else {
      console.log('⚠️  Running on local network - omitting webServiceURL to avoid Apple Wallet rejection');
    }

    // Initialize the Pass
    // Use gift card specific certificates if set, otherwise fall back to loyalty card certificates
    const pass = new PKPass(
      {},
      {
        signerCert: Buffer.from(certBase64, 'base64'),
        signerKey: Buffer.from(keyBase64, 'base64'),
        wwdr: Buffer.from(wwdrCertBase64, 'base64'),
        signerKeyPassphrase: password
      },
      passJsonProps
    );

    // Add logo
    if (logoBuffer) {
      pass.addBuffer('logo.png', logoBuffer);
      pass.addBuffer('icon.png', logoBuffer);
    }

    // Generate and add background image
    if (logoBuffer) {
      try {
        const backgroundBuffer = await generateGiftCardBackground(balanceMxn, logoBuffer);
        pass.addBuffer('background.png', backgroundBuffer);
        pass.addBuffer('background@2x.png', backgroundBuffer);
        
        // Also add as strip image
        const backgroundMetadata = await sharp(backgroundBuffer).metadata();
        const topSectionHeight = Math.floor((backgroundMetadata.height || 234) * 0.6);
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
      } catch (error: any) {
        console.error('⚠️ Failed to generate background image:', error?.message || error);
      }
    }

    pass.type = 'storeCard';

    // Balance in top right corner (headerFields)
    pass.headerFields.push({
      key: 'balance',
      label: 'BALANCE',
      value: `$${balanceMxn.toFixed(2)}`,
      textAlignment: 'PKTextAlignmentRight'
    });

    // Recipient name (secondaryFields)
    pass.secondaryFields.push({
      key: 'recipient',
      label: 'RECIPIENT',
      value: giftCard.recipient_name || 'Gift Card',
      textAlignment: 'PKTextAlignmentLeft'
    });

    // Balance status message (auxiliaryFields)
    if (balanceMxn === 0) {
      pass.auxiliaryFields.push({
        key: 'status',
        label: 'STATUS',
        value: 'Balance is zero',
        textAlignment: 'PKTextAlignmentLeft'
      });
    } else {
      pass.auxiliaryFields.push({
        key: 'status',
        label: 'STATUS',
        value: 'Active',
        textAlignment: 'PKTextAlignmentLeft'
      });
    }

    // Add gift card details to backFields
    pass.backFields.push({
      key: 'initialBalance',
      label: 'Initial Balance',
      value: `$${Number(giftCard.initial_balance_mxn).toFixed(2)} MXN`
    });
    pass.backFields.push({
      key: 'currentBalance',
      label: 'Current Balance',
      value: `$${balanceMxn.toFixed(2)} MXN`
    });
    pass.backFields.push({
      key: 'balanceUsed',
      label: 'Balance Used',
      value: `$${(Number(giftCard.initial_balance_mxn) - balanceMxn).toFixed(2)} MXN`
    });

    // Add barcode (serial number)
    const barcodeMessage = giftCard.serial_number;
    if (!barcodeMessage) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid serial number for barcode generation' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  
    try {
      pass.setBarcodes({
        format: 'PKBarcodeFormatQR',
        message: barcodeMessage,
        messageEncoding: 'iso-8859-1'
      });
    } catch (barcodeError: any) {
      console.error('❌ Failed to set barcode:', barcodeError);
      return new NextResponse(
        JSON.stringify({ error: 'Failed to set barcode', details: barcodeError?.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Generate and serve the pass file
    try {
      const buffer = pass.getAsBuffer();
      
      if (!buffer || buffer.length === 0) {
        throw new Error('Generated pass buffer is empty');
      }
      
      // Validate it's a valid PKPass file (ZIP format)
      const bufferStart = buffer.subarray(0, 2);
      const isZip = bufferStart[0] === 0x50 && bufferStart[1] === 0x4B; // PK (ZIP signature)
      if (!isZip) {
        throw new Error('Generated pass is not a valid ZIP file');
      }
      
      console.log(`✅ Gift card pass generated successfully for ${serialNumber}, size: ${buffer.length} bytes`);
      
      return new NextResponse(buffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/vnd.apple.pkpass',
          'Content-Disposition': 'attachment; filename=gift-card.pkpass',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } catch (error: any) {
      console.error('❌ Error generating gift card pass:', error);
      return new NextResponse(
        JSON.stringify({ 
          error: 'Failed to generate pass', 
          details: error?.message
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('❌ Gift card pass update error:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error?.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
