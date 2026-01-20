import { NextRequest, NextResponse } from 'next/server';
import { PKPass } from 'passkit-generator';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { generateGiftCardBackground } from '@/lib/passkit/gift-card-pass-generator';
import { generateAuthToken } from '@/lib/passkit/auth-token';

export async function GET(req: NextRequest) {
  try {
    // Support separate gift card certificates, with fallback to loyalty card certificates
    const certBase64 = process.env.GIFT_CARD_PASS_CERT_BASE64 || process.env.APPLE_PASS_CERT_BASE64;
    const keyBase64 = process.env.GIFT_CARD_PASS_KEY_BASE64 || process.env.APPLE_PASS_KEY_BASE64;
    const password = process.env.GIFT_CARD_PASS_PASSWORD || process.env.APPLE_PASS_PASSWORD;
    const wwdrCertBase64 = process.env.GIFT_CARD_WWDR_CERT_BASE64 || process.env.APPLE_WWDR_CERT_BASE64;

    // Validate required environment variables
    if (!certBase64 || !keyBase64 || !wwdrCertBase64) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Apple Pass certificates not configured',
          details: 'Set GIFT_CARD_PASS_CERT_BASE64, GIFT_CARD_PASS_KEY_BASE64, and GIFT_CARD_WWDR_CERT_BASE64 (or use APPLE_PASS_* variables)'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { searchParams } = new URL(req.url);
    const shareToken = searchParams.get('shareToken');
    const serialNumber = searchParams.get('serialNumber');

    if (!shareToken && !serialNumber) {
      return new NextResponse(
        JSON.stringify({ error: 'shareToken or serialNumber is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createServiceRoleClient();

    // Fetch gift card by share token or serial number
    let giftCardQuery = supabase.from('gift_cards').select('*');
    
    if (shareToken) {
      giftCardQuery = giftCardQuery.eq('share_token', shareToken);
    } else {
      giftCardQuery = giftCardQuery.eq('serial_number', serialNumber);
    }

    const { data: giftCard, error: giftCardError } = await giftCardQuery.single();

    if (giftCardError || !giftCard) {
      return new NextResponse(
        JSON.stringify({ error: 'Gift card not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if gift card is active
    if (!giftCard.is_active) {
      return new NextResponse(
        JSON.stringify({ error: 'Gift card is inactive' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Load logo image (REQUIRED by Apple Wallet)
    let logoBuffer: Buffer | undefined;
    try {
      const logoPath = join(process.cwd(), 'public', 'logo.png');
      logoBuffer = readFileSync(logoPath);
      console.log('✅ Logo loaded:', logoBuffer.length, 'bytes');
    } catch (error) {
      console.error('❌ Failed to load logo:', error);
      return new NextResponse(
        JSON.stringify({ error: 'Logo image is required but not found. Please ensure logo.png exists in the public folder.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!logoBuffer) {
      return new NextResponse(
        JSON.stringify({ error: 'Logo image is required for Apple Wallet passes' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Configure Web Service URL for Real-Time Updates
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
      'http://localhost:3000');
    
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${baseUrl}`;
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

    const passTypeIdentifier = process.env.GIFT_CARD_PASS_TYPE_ID || 'pass.com.vigocoffee.giftcard';
    const balanceMxn = Number(giftCard.balance_mxn) || 0;

    // Log pass configuration for debugging
    console.log('💳 Gift Card Pass Configuration:');
    console.log('   Pass Type ID:', passTypeIdentifier);
    console.log('   Team ID:', teamIdentifier);
    console.log('   Serial Number:', giftCard.serial_number);
    console.log('   Balance:', balanceMxn, 'MXN');
    console.log('   Is Public URL:', isPublicUrl);
    if (!process.env.GIFT_CARD_PASS_TYPE_ID) {
      console.warn('⚠️  GIFT_CARD_PASS_TYPE_ID not set, using default:', passTypeIdentifier);
      console.warn('   Make sure this Pass Type ID is registered in your Apple Developer account!');
    }

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
      // On localhost/local network, omit webServiceURL to avoid Apple Wallet rejection
      // The pass will still work, but automatic updates won't be available
      console.log('⚠️  Running on local network - omitting webServiceURL to avoid Apple Wallet rejection');
      console.log('   Pass will work but automatic updates will not be available');
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

    // Add logo (REQUIRED by Apple Wallet)
    pass.addBuffer('logo.png', logoBuffer);
    pass.addBuffer('icon.png', logoBuffer);

    // Generate and add background image
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
      
      return new NextResponse(buffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/vnd.apple.pkpass',
          'Content-Disposition': 'attachment; filename=gift-card.pkpass',
        },
      });
    } catch (error: any) {
      console.error('❌ Error generating pass:', error);
      return new NextResponse(
        JSON.stringify({ 
          error: 'Failed to generate pass', 
          details: error?.message
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('❌ Gift card pass generation error:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error?.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
