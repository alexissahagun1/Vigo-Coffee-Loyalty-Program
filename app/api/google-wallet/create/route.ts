import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWalletClient, isGoogleWalletConfigured, getServiceAccountCredentials } from '@/lib/google-wallet/auth';
import { ensureLoyaltyClassExists } from '@/lib/google-wallet/class-manager';
import { generateGoogleWalletPass, generateAddToWalletJWT, ProfileData } from '@/lib/google-wallet/pass-generator';
import { generateLoyaltyCardBackground } from '@/lib/loyalty-card/generate-background';
import { readFileSync } from 'fs';
import { join } from 'path';
import { getImageUrl, getBaseUrl } from '@/lib/google-wallet/image-urls';

/**
 * GET /api/google-wallet/create
 * 
 * Creates a Google Wallet pass for the authenticated user.
 * Returns a link to add the pass to Google Wallet.
 * 
 * Similar to /api/wallet but for Google Wallet instead of Apple Wallet.
 */
export async function GET(req: NextRequest) {
  try {
    // Check if Google Wallet is configured
    if (!isGoogleWalletConfigured()) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Google Wallet is not configured',
          message: 'Please configure Google Wallet environment variables'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Authenticate User
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Fetch User Data (Points)
    const { data: profile, error: profileError, status } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Handle profile not found (similar to Apple Wallet endpoint)
    if (profileError && status !== 406) {
      return new NextResponse(
        JSON.stringify({ error: 'Failed to fetch profile', details: profileError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let finalProfile = profile;

    // Create profile if it doesn't exist
    if (!finalProfile || status === 406) {
      // Retry up to 3 times with increasing delays
      let retryProfile = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        const { data: retriedProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (retriedProfile) {
          retryProfile = retriedProfile;
          console.log(`✅ Profile found after ${attempt + 1} retry attempt(s)`);
          break;
        }
      }
      
      if (retryProfile) {
        finalProfile = retryProfile;
      } else {
        // Create fallback profile
        console.log('⚠️ Profile not found after retries, creating fallback profile');
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({ 
            id: user.id, 
            points_balance: 0, 
            total_purchases: 0,
            full_name: 'Valued Customer'
          })
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
    }

    // Ensure profile has required fields
    if (!finalProfile.full_name || !finalProfile.full_name.trim()) {
      await supabase
        .from('profiles')
        .update({ full_name: 'Valued Customer' })
        .eq('id', user.id);
      finalProfile.full_name = 'Valued Customer';
    }
    
    if (finalProfile.points_balance === null || finalProfile.points_balance === undefined) {
      await supabase
        .from('profiles')
        .update({ points_balance: 0 })
        .eq('id', user.id);
      finalProfile.points_balance = 0;
    }

    // 3. Load image assets for background generation
    let logoBuffer: Buffer | undefined;
    let redTigerBuffer: Buffer | undefined;
    let whiteTigerBuffer: Buffer | undefined;
    
    try {
      logoBuffer = readFileSync(join(process.cwd(), 'public', 'logo.png'));
      redTigerBuffer = readFileSync(join(process.cwd(), 'public', 'tiger-red.png'));
      whiteTigerBuffer = readFileSync(join(process.cwd(), 'public', 'tiger-white.png'));
    } catch (error) {
      console.error('Failed to load images:', error);
      // Continue without images - pass will still work
    }

    // 4. Generate background image URL (use API endpoint instead of direct buffer)
    // This endpoint will serve the dynamically generated tiger grid on-demand
    let backgroundImageUrl: string | undefined;
    try {
      const baseUrl = getBaseUrl();
      const { isPublicUrl } = await import('@/lib/google-wallet/image-urls');
      
      console.log(`🔍 Background Image URL Debug:`);
      console.log(`   Base URL: ${baseUrl}`);
      console.log(`   NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || 'not set'}`);
      console.log(`   VERCEL_URL: ${process.env.VERCEL_URL || 'not set'}`);
      console.log(`   Is public URL: ${isPublicUrl(baseUrl)}`);
      console.log(`   User ID: ${user.id}`);
      
      if (isPublicUrl(baseUrl)) {
        // Use API endpoint to serve the generated image on-demand
        // The endpoint generates the image with current points
        // Timestamp query param ensures Google Wallet fetches fresh image
        backgroundImageUrl = `${baseUrl}/api/google-wallet/background/${user.id}?t=${Date.now()}`;
        console.log(`✅ Using heroImage URL: ${backgroundImageUrl}`);
        console.log(`   URL length: ${backgroundImageUrl.length} characters`);
        
        // Test if the URL is valid
        try {
          const urlObj = new URL(backgroundImageUrl);
          console.log(`   ✅ URL is valid: ${urlObj.protocol}//${urlObj.host}${urlObj.pathname}${urlObj.search}`);
        } catch (urlError: any) {
          console.error(`   ❌ Invalid URL format: ${urlError.message}`);
        }
      } else {
        console.warn('⚠️  Skipping heroImage - localhost URLs are not accessible by Google Wallet');
        console.warn('   Set NEXT_PUBLIC_APP_URL to a public URL to enable heroImage');
      }
    } catch (urlError: any) {
      console.error('❌ Skipping heroImage due to URL error:', urlError.message);
      console.error('   Stack:', urlError.stack);
    }

    // Note: We still load the buffers for class creation (programLogo), but don't use them for object heroImage
    // The heroImage is served via the endpoint above

    // 5. Ensure pass class exists (returns the class ID to use)
    const baseUrl = getBaseUrl();
    const classIdToUse = await ensureLoyaltyClassExists(baseUrl);

    // 6. Calculate object ID using hash-based approach for better compatibility
    // Format: ${issuerId}.${objectSuffix} as per Google Wallet API documentation
    // Use SHA-256 hash of user ID to create a consistent, alphanumeric-only identifier
    const { getIssuerId } = await import('@/lib/google-wallet/auth');
    const crypto = require('crypto');
    const issuerId = getIssuerId();
    
    // Create a hash-based object suffix (16 chars, alphanumeric only)
    // This ensures consistent format and avoids UUID-related issues
    const hash = crypto.createHash('sha256').update(user.id).digest('hex');
    const objectSuffix = hash.substring(0, 16); // Use first 16 chars of hash
    const objectId = `${issuerId}.${objectSuffix}`;
    
    // Validate object ID format (alphanumeric, periods, underscores, hyphens allowed)
    const objectIdFormatValid = /^[A-Z0-9]+\.[a-zA-Z0-9._-]+$/.test(objectId);
    if (!objectIdFormatValid) {
      throw new Error(`Invalid object ID format: ${objectId}. Must be ${issuerId}.{alphanumeric_suffix}`);
    }
    
    console.log(`🔍 Object ID Generation:`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Hash (first 16): ${objectSuffix}`);
    console.log(`   Full Object ID: ${objectId}`);

    // 6. Generate pass object with the correct class ID and object ID
    const profileData: ProfileData = {
      id: user.id,
      full_name: finalProfile.full_name,
      points_balance: finalProfile.points_balance,
      redeemed_rewards: finalProfile.redeemed_rewards,
      email: user.email || undefined,
    };

    const loyaltyObject = await generateGoogleWalletPass(profileData, backgroundImageUrl, classIdToUse, objectId);

    // Debug: Log the IDs we're using
    console.log(`🔍 Google Wallet Object Debug:`);
    console.log(`   Object ID: ${objectId}`);
    console.log(`   Object ID format: ${/^[A-Z0-9]+\.[a-zA-Z0-9._-]+$/.test(objectId) ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`   Class ID: ${classIdToUse}`);
    console.log(`   Class ID format: ${/^[A-Z0-9]+\.[a-zA-Z0-9._-]+$/.test(classIdToUse) ? '✅ Valid' : '❌ Invalid'}`);
    console.log(`   Object ID length: ${objectId.length}`);
    console.log(`   Class ID length: ${classIdToUse.length}`);

    // 7. Create pass in Google Wallet
    const wallet = getWalletClient();
    
    // Log the complete object structure for debugging
    console.log(`🔍 Complete Loyalty Object Structure:`);
    console.log(`   id: ${loyaltyObject.id}`);
    console.log(`   classId: ${loyaltyObject.classId}`);
    console.log(`   state: ${loyaltyObject.state}`);
    console.log(`   accountId: ${loyaltyObject.accountId}`);
    console.log(`   accountName: ${loyaltyObject.accountName}`);
    console.log(`   heroImage: ${loyaltyObject.heroImage ? 'SET' : 'NOT SET'}`);
    if (loyaltyObject.heroImage) {
      console.log(`   heroImage.sourceUri.uri: ${loyaltyObject.heroImage.sourceUri?.uri}`);
      console.log(`   heroImage structure:`, JSON.stringify(loyaltyObject.heroImage, null, 2));
    }
    
    // Log the exact request body that will be sent to Google Wallet API
    console.log(`🔍 Request Body to Google Wallet API:`);
    console.log(JSON.stringify(loyaltyObject, null, 2));
    
    // Test if the image URL is accessible before sending to Google Wallet
    if (loyaltyObject.heroImage?.sourceUri?.uri) {
      const testUrl = loyaltyObject.heroImage.sourceUri.uri;
      console.log(`🔍 Testing image URL accessibility: ${testUrl}`);
      try {
        const testResponse = await fetch(testUrl, { 
          method: 'HEAD',
          headers: {
            'User-Agent': 'Google-Wallet-API-Test/1.0'
          }
        });
        console.log(`   Response status: ${testResponse.status}`);
        console.log(`   Content-Type: ${testResponse.headers.get('content-type')}`);
        console.log(`   Content-Length: ${testResponse.headers.get('content-length')}`);
        if (!testResponse.ok) {
          console.error(`   ❌ Image URL returned status ${testResponse.status}`);
        } else {
          console.log(`   ✅ Image URL is accessible`);
        }
      } catch (fetchError: any) {
        console.error(`   ❌ Failed to fetch image URL: ${fetchError.message}`);
      }
    }
    
    try {
      // Try to get existing pass first
      try {
        await wallet.loyaltyobject.get({
          resourceId: objectId,
        });
        // Pass exists, update it instead
        console.log(`📝 Updating existing Google Wallet pass with object ID: ${objectId}`);
        await wallet.loyaltyobject.update({
          resourceId: objectId,
          requestBody: loyaltyObject,
        });
        console.log(`✅ Google Wallet pass updated for user ${user.id}`);
      } catch (error: any) {
        if (error.code === 404) {
          // Pass doesn't exist, create it
          console.log(`📝 Creating new Google Wallet pass with object ID: ${objectId}`);
          await wallet.loyaltyobject.insert({
            requestBody: loyaltyObject,
          });
          console.log(`✅ Google Wallet pass created for user ${user.id}`);
        } else if (error.code === 403) {
          // 403 Permission denied - try to create anyway (might work even if get() fails)
          console.log(`⚠️  Got 403 Permission denied checking object. Attempting to create anyway...`);
          try {
            await wallet.loyaltyobject.insert({
              requestBody: loyaltyObject,
            });
            console.log(`✅ Google Wallet pass created for user ${user.id} (despite 403 on get)`);
          } catch (insertError: any) {
            console.error(`❌ Failed to create object:`, insertError.message);
            if (insertError.response?.data) {
              console.error(`   API Error Details:`, JSON.stringify(insertError.response.data, null, 2));
            }
            throw insertError;
          }
        } else if (error.code === 404) {
          // 404 might mean class not approved or object doesn't exist
          // Check if it's a class approval issue
          if (error.message?.includes('not approved') || error.message?.includes('classNotFound')) {
            console.error(`❌ Google Wallet Class Not Approved:`);
            console.error(`   Class ID: ${classIdToUse}`);
            console.error(`   Error: ${error.message}`);
            console.error(`   The class exists but is not approved yet.`);
            console.error(`   Please check the Google Wallet Console and ensure the class is APPROVED.`);
            return new NextResponse(
              JSON.stringify({ 
                error: 'Google Wallet class not approved',
                message: 'The loyalty class exists but is not yet approved by Google. Please check the Google Wallet Console and wait for approval, or contact Google Wallet support.',
                classId: classIdToUse,
                details: error.message
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
          }
          // Otherwise, try to create the object (might be a new object)
          console.log(`📝 Creating new Google Wallet pass with object ID: ${objectId}`);
          try {
            await wallet.loyaltyobject.insert({
              requestBody: loyaltyObject,
            });
            console.log(`✅ Google Wallet pass created for user ${user.id}`);
          } catch (insertError: any) {
            // If insert also fails with class not approved, return helpful error
            if (insertError.code === 404 && (insertError.message?.includes('not approved') || insertError.message?.includes('classNotFound'))) {
              return new NextResponse(
                JSON.stringify({ 
                  error: 'Google Wallet class not approved',
                  message: 'The loyalty class exists but is not yet approved by Google. Please check the Google Wallet Console and wait for approval.',
                  classId: classIdToUse,
                  details: insertError.message
                }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
              );
            }
            throw insertError;
          }
        } else if (error.code === 400) {
          // 400 error - log full error details
          console.error(`❌ 400 Error Details:`);
          console.error(`   Code: ${error.code}`);
          console.error(`   Message: ${error.message}`);
          if (error.response?.data) {
            console.error(`   API Response:`, JSON.stringify(error.response.data, null, 2));
          }
          
          // Try to create anyway (sometimes get() fails but insert() works)
          console.log(`⚠️  Attempting to create object despite 400 error...`);
          try {
            await wallet.loyaltyobject.insert({
              requestBody: loyaltyObject,
            });
            console.log(`✅ Google Wallet pass created for user ${user.id} (despite initial 400 error)`);
          } catch (insertError: any) {
            console.error(`❌ Failed to create object:`, insertError.message);
            if (insertError.response?.data) {
              console.error(`   API Error Details:`, JSON.stringify(insertError.response.data, null, 2));
            }
            throw insertError;
          }
        } else {
          throw error;
        }
      }

      // 8. Verify the object was created successfully before generating the link
      let objectExists = false;
      try {
        await wallet.loyaltyobject.get({
          resourceId: objectId,
        });
        objectExists = true;
        console.log(`✅ Verified: Google Wallet pass object exists: ${objectId}`);
      } catch (verifyError: any) {
        console.error(`⚠️  Warning: Could not verify object exists: ${verifyError.message}`);
        // Continue anyway - might be a permission issue
      }

      // 9. Generate "Add to Google Wallet" link
      // Google Wallet requires a signed JWT token, not just the raw object ID
      // Format: https://pay.google.com/gp/v/save/{signedJWT}
      // The JWT must contain the object ID in the payload
      let addToWalletUrl: string;
      try {
        const jwtToken = await generateAddToWalletJWT(loyaltyObject);
        addToWalletUrl = `https://pay.google.com/gp/v/save/${jwtToken}`;
        console.log(`✅ Generated signed JWT for Add to Wallet link`);
      } catch (jwtError: any) {
        console.error(`❌ Failed to generate JWT: ${jwtError.message}`);
        // Fallback to object ID (won't work, but at least we return something)
        addToWalletUrl = `https://pay.google.com/gp/v/save/${objectId}`;
        console.warn(`⚠️  Using raw object ID (will not work - JWT generation failed)`);
      }

      console.log(`✅ Google Wallet pass ready!`);
      console.log(`   Object ID: ${objectId}`);
      console.log(`   Object exists: ${objectExists ? 'Yes' : 'Unknown (may need class approval)'}`);
      console.log(`   Class ID: ${classIdToUse}`);
      console.log(`   Add to Wallet URL: ${addToWalletUrl.substring(0, 100)}... (truncated for logging)`);

      return NextResponse.json({
        success: true,
        message: objectExists 
          ? 'Google Wallet pass created successfully' 
          : 'Google Wallet pass created, but class may need approval',
        addToWalletUrl: addToWalletUrl,
        passId: objectId,
        classId: classIdToUse,
        objectExists: objectExists,
        instructions: objectExists
          ? 'Click the link above to add this pass to your Google Wallet. Make sure you are signed in to the correct Google account.'
          : 'The pass object was created, but your class may still be under review. Check the Google Wallet Console to ensure the class is APPROVED. Once approved, the link will work.',
      });
    } catch (error: any) {
      console.error('❌ Failed to create Google Wallet pass:', error);
      if (error.response) {
        console.error('   API Error:', JSON.stringify(error.response.data, null, 2));
      }
      return new NextResponse(
        JSON.stringify({ 
          error: 'Failed to create Google Wallet pass', 
          details: error.message,
          apiError: error.response?.data
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: any) {
    console.error('❌ Error in Google Wallet create endpoint:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error?.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

