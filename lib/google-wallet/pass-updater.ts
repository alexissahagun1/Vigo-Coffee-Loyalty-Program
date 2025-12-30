import { getWalletClient, getIssuerId, isGoogleWalletConfigured } from './auth';
import { generateGoogleWalletPass, ProfileData } from './pass-generator';
import { walletobjects_v1 } from 'googleapis';

/**
 * ============================================
 * GOOGLE WALLET ONLY - Pass Updater
 * ============================================
 * 
 * ⚠️  IMPORTANT: This module is EXCLUSIVELY for Google Wallet updates.
 * Do NOT use this for Apple Wallet - Apple Wallet uses push notifications.
 * 
 * This module handles direct API calls to Google Wallet API to update passes
 * when user data changes (e.g., points update).
 * 
 * How Google Wallet Updates Work:
 * 1. This function directly calls Google Wallet API to update the pass
 * 2. Google Wallet API updates the pass immediately
 * 3. The pass is updated in the user's Google Wallet app automatically
 * 
 * Key Differences from Apple Wallet:
 * - Apple: Uses push notifications → Apple fetches updated pass from our server
 * - Google: Direct API call → Google updates pass immediately via their API
 * 
 * For Apple Wallet updates, use: lib/passkit/push-notifications.ts
 */

/**
 * Updates a Google Wallet pass with new profile data
 * @param userId - User ID (same as pass object ID)
 * @param profile - Updated profile data
 * @param backgroundImageUrl - Optional URL to updated background image
 * @returns True if update was successful, false if pass doesn't exist or update failed
 */
export async function updateGoogleWalletPass(
  userId: string,
  profile: ProfileData,
  backgroundImageUrl?: string
): Promise<boolean> {
  console.log(`🤖 [GOOGLE WALLET] 🔄 Starting Google Wallet pass update for user ${userId}`);
  console.log(`🤖 [GOOGLE WALLET]    Profile points: ${profile.points_balance}`);
  console.log(`🤖 [GOOGLE WALLET]    Profile name: ${profile.full_name}`);
  console.log(`🤖 [GOOGLE WALLET]    Profile ID: ${profile.id}`);
  console.log(`🤖 [GOOGLE WALLET]    ⚠️  CRITICAL CHECK: Points value type: ${typeof profile.points_balance}, value: ${profile.points_balance}`);
  
  // Ensure points_balance is a valid number
  const pointsValue = Number(profile.points_balance) || 0;
  console.log(`🤖 [GOOGLE WALLET]    ⚠️  CRITICAL CHECK: Normalized points value: ${pointsValue}`);
  
  if (!isGoogleWalletConfigured()) {
    console.log('🤖 [GOOGLE WALLET] ⚠️  Google Wallet not configured, skipping update');
    return false;
  }

  try {
    const wallet = getWalletClient();
    
    // Calculate object ID (must match the format used in create route)
    const issuerId = getIssuerId();
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(userId).digest('hex');
    const objectSuffix = hash.substring(0, 16);
    const objectId = `${issuerId}.${objectSuffix}`;
    
    console.log(`🤖 [GOOGLE WALLET]    Calculated object ID: ${objectId}`);
    console.log(`🤖 [GOOGLE WALLET]    User ID: ${userId}`);
    console.log(`🤖 [GOOGLE WALLET]    Hash suffix: ${objectSuffix}`);

    // Check if pass exists and get current state
    let existingPass: walletobjects_v1.Schema$LoyaltyObject | null = null;
    try {
      console.log(`🤖 [GOOGLE WALLET]    Checking if pass exists...`);
      const response = await wallet.loyaltyobject.get({
        resourceId: objectId,
      });
      existingPass = response.data;
      const currentPoints = existingPass.loyaltyPoints?.balance?.int || existingPass.loyaltyPoints?.balance?.string || 0;
      console.log(`🤖 [GOOGLE WALLET]    ✅ Pass exists!`);
      console.log(`🤖 [GOOGLE WALLET]       Current points in pass: ${currentPoints}`);
      console.log(`🤖 [GOOGLE WALLET]       Current points label: ${existingPass.loyaltyPoints?.label || 'N/A'}`);
      console.log(`🤖 [GOOGLE WALLET]       New points to set: ${profile.points_balance || 0}`);
      
      // Check if update is actually needed
      if (currentPoints === (profile.points_balance || 0)) {
        console.log(`🤖 [GOOGLE WALLET]    ℹ️  Points are already up to date, skipping update`);
        return true;
      }
    } catch (error: any) {
      // Pass doesn't exist yet - user hasn't added it to wallet
      if (error.code === 404) {
        console.log(`🤖 [GOOGLE WALLET] 📱 Google Wallet pass not found for user ${userId} - user hasn't added pass yet`);
        console.log(`🤖 [GOOGLE WALLET]    Object ID checked: ${objectId}`);
        return false;
      }
      console.error(`🤖 [GOOGLE WALLET]    ❌ Error checking pass existence:`, error.message);
      throw error;
    }

    // Get base URL for heroImage endpoint
    const { getBaseUrl, isPublicUrl } = await import('./image-urls');
    const baseUrl = getBaseUrl();
    const canUpdateHeroImage = isPublicUrl(baseUrl);
    
    // Generate heroImage URL if we have a public URL
    const heroImageUrl = canUpdateHeroImage 
      ? `${baseUrl}/api/google-wallet/background/${userId}?ts=${Date.now()}`
      : undefined;
    
    console.log(`🤖 [GOOGLE WALLET]    Hero image URL: ${heroImageUrl || 'Not available (not public URL)'}`);

    // Generate updated pass data (will include heroImage if URL provided)
    // Use the same object ID that was used when creating the pass
    console.log(`🤖 [GOOGLE WALLET]    Generating updated pass data...`);
    console.log(`🤖 [GOOGLE WALLET]    ⚠️  BEFORE GENERATION: Profile points_balance = ${profile.points_balance} (type: ${typeof profile.points_balance})`);
    
    const { getClassId } = await import('./auth');
    const classId = getClassId();
    const updatedPass = await generateGoogleWalletPass(profile, heroImageUrl, classId, objectId);
    
    console.log(`🤖 [GOOGLE WALLET]    ✅ Generated pass data:`);
    console.log(`🤖 [GOOGLE WALLET]       Object ID: ${updatedPass.id}`);
    console.log(`🤖 [GOOGLE WALLET]       Class ID: ${updatedPass.classId}`);
    const generatedPoints = updatedPass.loyaltyPoints?.balance?.int || updatedPass.loyaltyPoints?.balance?.string || 0;
    console.log(`🤖 [GOOGLE WALLET]       ⚠️  CRITICAL: Points in generated pass: ${generatedPoints} (expected: ${profile.points_balance || 0})`);
    console.log(`🤖 [GOOGLE WALLET]       Points label: ${updatedPass.loyaltyPoints?.label || 'N/A'}`);
    console.log(`🤖 [GOOGLE WALLET]       Account name: ${updatedPass.accountName || 'N/A'}`);
    console.log(`🤖 [GOOGLE WALLET]       Text modules: ${updatedPass.textModulesData?.length || 0} modules`);
    console.log(`🤖 [GOOGLE WALLET]       Hero image: ${updatedPass.heroImage ? 'Yes' : 'No'}`);
    console.log(`🤖 [GOOGLE WALLET]       State: ${updatedPass.state || 'N/A'}`);
    
    // Log the full loyaltyPoints object to verify structure
    console.log(`🤖 [GOOGLE WALLET]    Full loyaltyPoints object:`, JSON.stringify(updatedPass.loyaltyPoints, null, 2));
    
    // CRITICAL: Verify points match before sending
    if (generatedPoints !== (profile.points_balance || 0)) {
      console.error(`🤖 [GOOGLE WALLET]    ❌ CRITICAL ERROR: Points mismatch! Generated: ${generatedPoints}, Expected: ${profile.points_balance || 0}`);
      console.error(`🤖 [GOOGLE WALLET]    This means the pass will be updated with WRONG points value!`);
    } else {
      console.log(`🤖 [GOOGLE WALLET]    ✅ Points match! Generated points (${generatedPoints}) = Profile points (${profile.points_balance || 0})`);
    }

    // Log the FULL request body to verify loyaltyPoints is included
    console.log(`🤖 [GOOGLE WALLET]    📤 Full request body being sent to Google Wallet API:`);
    console.log(`🤖 [GOOGLE WALLET]    `, JSON.stringify({
      id: updatedPass.id,
      classId: updatedPass.classId,
      state: updatedPass.state,
      loyaltyPoints: updatedPass.loyaltyPoints,
      accountName: updatedPass.accountName,
      accountId: updatedPass.accountId,
      textModulesData: updatedPass.textModulesData,
      heroImage: updatedPass.heroImage ? 'SET' : 'NOT SET',
    }, null, 2));

    // Update the pass using update() method (same as create route)
    // This ensures all fields are properly set and matches the create route behavior
    console.log(`🤖 [GOOGLE WALLET]    Updating pass with object ID: ${objectId}...`);
    console.log(`🤖 [GOOGLE WALLET]    Request body points: ${updatedPass.loyaltyPoints?.balance?.int || 'N/A'}`);
    console.log(`🤖 [GOOGLE WALLET]    ⚠️  CRITICAL: Verifying loyaltyPoints.balance.int = ${updatedPass.loyaltyPoints?.balance?.int} (should be ${profile.points_balance || 0})`);

    const updateResponse = await wallet.loyaltyobject.update({
      resourceId: objectId,
      requestBody: updatedPass,
    });
    
    console.log(`🤖 [GOOGLE WALLET]    ✅ Update response received`);
    const updatedPoints = updateResponse.data.loyaltyPoints?.balance?.int || updateResponse.data.loyaltyPoints?.balance?.string || 0;
    console.log(`🤖 [GOOGLE WALLET]    Updated points in response: ${updatedPoints}`);
    console.log(`🤖 [GOOGLE WALLET]    Updated points label: ${updateResponse.data.loyaltyPoints?.label || 'N/A'}`);
    
    // Verify the update by fetching the pass again
    try {
      console.log(`🤖 [GOOGLE WALLET]    Verifying update by fetching pass again...`);
      const verifyResponse = await wallet.loyaltyobject.get({
        resourceId: objectId,
      });
      const verifiedPoints = verifyResponse.data.loyaltyPoints?.balance?.int || verifyResponse.data.loyaltyPoints?.balance?.string || 0;
      console.log(`🤖 [GOOGLE WALLET]    ✅ Verification: Pass now has ${verifiedPoints} points`);
      
      if (verifiedPoints !== (profile.points_balance || 0)) {
        console.error(`🤖 [GOOGLE WALLET]    ⚠️  WARNING: Points mismatch! Expected ${profile.points_balance || 0}, but pass has ${verifiedPoints}`);
      } else {
        console.log(`🤖 [GOOGLE WALLET]    ✅ Points match! Update successful.`);
      }
    } catch (verifyError: any) {
      console.error(`🤖 [GOOGLE WALLET]    ⚠️  Could not verify update:`, verifyError.message);
    }

    console.log(`🤖 [GOOGLE WALLET] ✅ Google Wallet pass updated for user ${userId}`);
    return true;
  } catch (error: any) {
    console.error(`🤖 [GOOGLE WALLET] ❌ Failed to update Google Wallet pass for user ${userId}:`, error.message);
    console.error(`🤖 [GOOGLE WALLET]    Error stack:`, error.stack);
    if (error.response) {
      console.error('🤖 [GOOGLE WALLET]    API Error Status:', error.response.status);
      console.error('🤖 [GOOGLE WALLET]    API Error Data:', JSON.stringify(error.response.data, null, 2));
    }
    // Don't throw - this is a non-critical operation
    return false;
  }
}

/**
 * Checks if a user has a Google Wallet pass
 * @param userId - User ID
 * @returns True if pass exists
 */
export async function hasGoogleWalletPass(userId: string): Promise<boolean> {
  if (!isGoogleWalletConfigured()) {
    return false;
  }

  try {
    const wallet = getWalletClient();
    
    // Calculate object ID (must match the format used in create route)
    const issuerId = getIssuerId();
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(userId).digest('hex');
    const objectSuffix = hash.substring(0, 16);
    const objectId = `${issuerId}.${objectSuffix}`;
    
    await wallet.loyaltyobject.get({
      resourceId: objectId,
    });
    return true;
  } catch (error: any) {
    if (error.code === 404) {
      return false;
    }
    // Other errors - log but don't fail
    console.error(`🤖 [GOOGLE WALLET] Error checking Google Wallet pass for user ${userId}:`, error.message);
    return false;
  }
}

