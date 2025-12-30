import { getWalletClient, getIssuerId, isGoogleWalletConfigured } from './auth';
import { generateGoogleWalletPass, ProfileData } from './pass-generator';
import { walletobjects_v1 } from 'googleapis';

/**
 * Google Wallet Pass Updater
 * 
 * Updates existing Google Wallet passes when user data changes.
 * Equivalent to Apple Wallet's push notification system.
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
  console.log(`🔄 Starting Google Wallet pass update for user ${userId}`);
  console.log(`   Profile points: ${profile.points_balance}`);
  console.log(`   Profile name: ${profile.full_name}`);
  console.log(`   Profile ID: ${profile.id}`);
  console.log(`   ⚠️  CRITICAL CHECK: Points value type: ${typeof profile.points_balance}, value: ${profile.points_balance}`);
  
  // Ensure points_balance is a valid number
  const pointsValue = Number(profile.points_balance) || 0;
  console.log(`   ⚠️  CRITICAL CHECK: Normalized points value: ${pointsValue}`);
  
  if (!isGoogleWalletConfigured()) {
    console.log('⚠️  Google Wallet not configured, skipping update');
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
    
    console.log(`   Calculated object ID: ${objectId}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Hash suffix: ${objectSuffix}`);

    // Check if pass exists and get current state
    let existingPass: walletobjects_v1.Schema$LoyaltyObject | null = null;
    try {
      console.log(`   Checking if pass exists...`);
      const response = await wallet.loyaltyobject.get({
        resourceId: objectId,
      });
      existingPass = response.data;
      const currentPoints = existingPass.loyaltyPoints?.balance?.int || existingPass.loyaltyPoints?.balance?.string || 0;
      console.log(`   ✅ Pass exists!`);
      console.log(`      Current points in pass: ${currentPoints}`);
      console.log(`      Current points label: ${existingPass.loyaltyPoints?.label || 'N/A'}`);
      console.log(`      New points to set: ${profile.points_balance || 0}`);
      
      // Check if update is actually needed
      if (currentPoints === (profile.points_balance || 0)) {
        console.log(`   ℹ️  Points are already up to date, skipping update`);
        return true;
      }
    } catch (error: any) {
      // Pass doesn't exist yet - user hasn't added it to wallet
      if (error.code === 404) {
        console.log(`📱 Google Wallet pass not found for user ${userId} - user hasn't added pass yet`);
        console.log(`   Object ID checked: ${objectId}`);
        return false;
      }
      console.error(`   ❌ Error checking pass existence:`, error.message);
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
    
    console.log(`   Hero image URL: ${heroImageUrl || 'Not available (not public URL)'}`);

    // Generate updated pass data (will include heroImage if URL provided)
    // Use the same object ID that was used when creating the pass
    console.log(`   Generating updated pass data...`);
    console.log(`   ⚠️  BEFORE GENERATION: Profile points_balance = ${profile.points_balance} (type: ${typeof profile.points_balance})`);
    
    const { getClassId } = await import('./auth');
    const classId = getClassId();
    const updatedPass = await generateGoogleWalletPass(profile, heroImageUrl, classId, objectId);
    
    console.log(`   ✅ Generated pass data:`);
    console.log(`      Object ID: ${updatedPass.id}`);
    console.log(`      Class ID: ${updatedPass.classId}`);
    const generatedPoints = updatedPass.loyaltyPoints?.balance?.int || updatedPass.loyaltyPoints?.balance?.string || 0;
    console.log(`      ⚠️  CRITICAL: Points in generated pass: ${generatedPoints} (expected: ${profile.points_balance || 0})`);
    console.log(`      Points label: ${updatedPass.loyaltyPoints?.label || 'N/A'}`);
    console.log(`      Account name: ${updatedPass.accountName || 'N/A'}`);
    console.log(`      Text modules: ${updatedPass.textModulesData?.length || 0} modules`);
    console.log(`      Hero image: ${updatedPass.heroImage ? 'Yes' : 'No'}`);
    console.log(`      State: ${updatedPass.state || 'N/A'}`);
    
    // Log the full loyaltyPoints object to verify structure
    console.log(`   Full loyaltyPoints object:`, JSON.stringify(updatedPass.loyaltyPoints, null, 2));
    
    // CRITICAL: Verify points match before sending
    if (generatedPoints !== (profile.points_balance || 0)) {
      console.error(`   ❌ CRITICAL ERROR: Points mismatch! Generated: ${generatedPoints}, Expected: ${profile.points_balance || 0}`);
      console.error(`   This means the pass will be updated with WRONG points value!`);
    } else {
      console.log(`   ✅ Points match! Generated points (${generatedPoints}) = Profile points (${profile.points_balance || 0})`);
    }

    // Log the FULL request body to verify loyaltyPoints is included
    console.log(`   📤 Full request body being sent to Google Wallet API:`);
    console.log(`   `, JSON.stringify({
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
    console.log(`   Updating pass with object ID: ${objectId}...`);
    console.log(`   Request body points: ${updatedPass.loyaltyPoints?.balance?.int || 'N/A'}`);
    console.log(`   ⚠️  CRITICAL: Verifying loyaltyPoints.balance.int = ${updatedPass.loyaltyPoints?.balance?.int} (should be ${profile.points_balance || 0})`);

    const updateResponse = await wallet.loyaltyobject.update({
      resourceId: objectId,
      requestBody: updatedPass,
    });
    
    console.log(`   ✅ Update response received`);
    const updatedPoints = updateResponse.data.loyaltyPoints?.balance?.int || updateResponse.data.loyaltyPoints?.balance?.string || 0;
    console.log(`   Updated points in response: ${updatedPoints}`);
    console.log(`   Updated points label: ${updateResponse.data.loyaltyPoints?.label || 'N/A'}`);
    
    // Verify the update by fetching the pass again
    try {
      console.log(`   Verifying update by fetching pass again...`);
      const verifyResponse = await wallet.loyaltyobject.get({
        resourceId: objectId,
      });
      const verifiedPoints = verifyResponse.data.loyaltyPoints?.balance?.int || verifyResponse.data.loyaltyPoints?.balance?.string || 0;
      console.log(`   ✅ Verification: Pass now has ${verifiedPoints} points`);
      
      if (verifiedPoints !== (profile.points_balance || 0)) {
        console.error(`   ⚠️  WARNING: Points mismatch! Expected ${profile.points_balance || 0}, but pass has ${verifiedPoints}`);
      } else {
        console.log(`   ✅ Points match! Update successful.`);
      }
    } catch (verifyError: any) {
      console.error(`   ⚠️  Could not verify update:`, verifyError.message);
    }

    console.log(`✅ Google Wallet pass updated for user ${userId}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to update Google Wallet pass for user ${userId}:`, error.message);
    console.error(`   Error stack:`, error.stack);
    if (error.response) {
      console.error('   API Error Status:', error.response.status);
      console.error('   API Error Data:', JSON.stringify(error.response.data, null, 2));
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
    console.error(`Error checking Google Wallet pass for user ${userId}:`, error.message);
    return false;
  }
}

