import { getWalletClient, getClassId, getIssuerId, isGoogleWalletConfigured } from './auth';
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

    // Check if pass exists
    let existingPass: walletobjects_v1.Schema$LoyaltyObject | null = null;
    try {
      const response = await wallet.loyaltyobject.get({
        resourceId: objectId,
      });
      existingPass = response.data;
    } catch (error: any) {
      // Pass doesn't exist yet - user hasn't added it to wallet
      if (error.code === 404) {
        console.log(`📱 Google Wallet pass not found for user ${userId} - user hasn't added pass yet`);
        return false;
      }
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

    // Generate updated pass data (will include heroImage if URL provided)
    const updatedPass = await generateGoogleWalletPass(profile, heroImageUrl);

    // Update the pass using patch (only updates specified fields)
    // This is more efficient than full replace
    const patchBody: walletobjects_v1.Schema$LoyaltyObject = {
      // Update loyalty points
      loyaltyPoints: updatedPass.loyaltyPoints,
      
      // Update account name if changed
      accountName: updatedPass.accountName,
      // Note: localizedAccountName is a class-level property, not object-level
      
      // Update text modules (reward messages, etc.)
      textModulesData: updatedPass.textModulesData,
      
      // Update heroImage with fresh timestamp for cache busting
      ...(canUpdateHeroImage && updatedPass.heroImage
        ? { heroImage: updatedPass.heroImage }
        : {}),
    };

    await wallet.loyaltyobject.patch({
      resourceId: objectId,
      requestBody: patchBody,
    });

    console.log(`✅ Google Wallet pass updated for user ${userId}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Failed to update Google Wallet pass for user ${userId}:`, error.message);
    if (error.response) {
      console.error('   API Error:', JSON.stringify(error.response.data, null, 2));
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

