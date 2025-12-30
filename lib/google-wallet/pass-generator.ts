import { walletobjects_v1 } from 'googleapis';
import { getClassId, getIssuerId } from './auth';
import { calculateRewards } from '@/lib/wallet/shared-pass-data';
import { getImageUrl, getBaseUrl } from './image-urls';

/**
 * Google Wallet Pass Generator
 * 
 * Generates Google Wallet loyalty pass JSON structure.
 * Mirrors the logic from Apple Wallet implementation.
 */

export interface ProfileData {
  id: string;
  full_name?: string | null;
  points_balance?: number | null;
  redeemed_rewards?: {
    coffees?: number[];
    meals?: number[];
  } | null;
  email?: string | null;
}

/**
 * Generates a Google Wallet loyalty pass object
 * @param profile - User profile data from database
 * @param backgroundImageUrl - URL to the generated background image with tigers (optional)
 * @returns Google Wallet loyalty object
 */
export async function generateGoogleWalletPass(
  profile: ProfileData,
  backgroundImageUrl?: string,
  classIdOverride?: string,
  objectIdOverride?: string
): Promise<walletobjects_v1.Schema$LoyaltyObject> {
  // Use provided class ID (from console) or construct it
  const classId = classIdOverride || getClassId();
  
  // Get user data with fallbacks
  const userId = profile.id;
  const memberName = profile.full_name?.trim() || profile.email?.trim() || 'Valued Customer';
  const points = Number(profile.points_balance) || 0;
  const redeemedRewards = profile.redeemed_rewards || { coffees: [], meals: [] };

  // Calculate rewards using shared logic
  const rewardStatus = calculateRewards(points, redeemedRewards);

  // Build loyalty points object
  // Note: Google Wallet API only allows ONE type of balance (either string OR int, not both)
  const loyaltyPoints: walletobjects_v1.Schema$LoyaltyPoints = {
    balance: {
      int: points, // Use int type only
    },
    label: 'Points',
  };

  // Build text modules (equivalent to Apple Wallet fields)
  const textModulesData: walletobjects_v1.Schema$TextModuleData[] = [
    {
      header: 'MEMBER',
      body: memberName,
      id: 'member',
    },
    {
      header: rewardStatus.rewardLabel || 'Status',
      body: rewardStatus.rewardMessage || 'No reward yet! Keep shopping, you are almost there!',
      id: 'reward',
    },
    {
      header: 'Reward Structure',
      body: '25 stamps = meal, 10 stamps = coffee',
      id: 'rewardStructure',
    },
  ];

  // Build barcode (QR code with user ID)
  const barcode: walletobjects_v1.Schema$Barcode = {
    type: 'QR_CODE',
    value: userId,
    alternateText: userId.substring(0, 8) + '...',
  };

  // Build the loyalty object
  // Note: Object ID must be in format {issuerId}.{objectId}
  // Use provided object ID or construct it (fallback - should always be provided)
  const objectId = objectIdOverride || (() => {
    // Fallback: use first 16 chars of UUID without hyphens
    // This should rarely be used since objectIdOverride should always be provided
    const issuerId = getIssuerId();
    const userIdClean = userId.replace(/-/g, ''); // Remove hyphens from UUID
    const userIdShort = userIdClean.substring(0, 16); // Use first 16 chars
    return `${issuerId}.${userIdShort}`;
  })();
  
  // Build loyalty object - conditionally include heroImage
  const loyaltyObject: walletobjects_v1.Schema$LoyaltyObject = {
    id: objectId, // Full object resource ID: issuerId.userId (alphanumeric only)
    classId: classId, // Class resource ID (from console or constructed)
    state: 'ACTIVE',
    accountName: memberName, // This should display the customer name on the pass
    accountId: userId,
    loyaltyPoints: loyaltyPoints,
    barcode: barcode,
    textModulesData: textModulesData,
    // Note: programName and localizedProgramName are class-level only and cannot be personalized per user
    // The accountName field above should display the customer name prominently
  };

  // Conditionally add heroImage if URL is provided
  // Use heroImage for the tiger grid (banner at top of card)
  // This is the recommended approach for dynamic images in Google Wallet
  // Hero images are supported on Android Google Wallet
  if (backgroundImageUrl) {
    // Ensure the URL is a valid string (not undefined or null)
    const imageUrl = String(backgroundImageUrl).trim();
    if (imageUrl && imageUrl.startsWith('http')) {
      loyaltyObject.heroImage = {
        kind: 'walletobjects#image',
        sourceUri: {
          uri: imageUrl,
        },
        contentDescription: {
          defaultValue: {
            language: 'en-US',
            value: `Loyalty card with ${points} points - ${rewardStatus.rewardMessage || 'Keep shopping!'}`,
          },
        },
      };
      console.log(`✅ Hero image enabled: ${imageUrl}`);
    } else {
      console.warn(`⚠️  Invalid backgroundImageUrl format: ${backgroundImageUrl}`);
    }
  } else {
    console.log(`ℹ️  Hero image not set - backgroundImageUrl not provided`);
  }

  return loyaltyObject;
}

/**
 * Generates a signed JWT token for "Add to Google Wallet" link
 * Google Wallet requires a signed JWT containing the object ID, not just the raw object ID
 * @param loyaltyObject - The loyalty object to encode
 * @returns Signed JWT token string
 */
export async function generateAddToWalletJWT(
  loyaltyObject: walletobjects_v1.Schema$LoyaltyObject,
): Promise<string> {
  const jwt = require('jsonwebtoken');
  const { getServiceAccountCredentials } = await import('./auth');
  const { getBaseUrl } = await import('./image-urls');

  const credentials = getServiceAccountCredentials();

  // Define the JWT claims (payload)
  // This is the structure Google Wallet expects for "Save to Wallet" links
  const claims = {
    iss: credentials.client_email, // Issuer (service account email)
    aud: 'google', // Audience (must be 'google')
    origins: [getBaseUrl()], // Allowed origins for the JWT
    typ: 'savetowallet', // Type (must be 'savetowallet')
    payload: {
      loyaltyObjects: [
        {
          id: loyaltyObject.id, // The object ID we created
        },
      ],
    },
  };

  // Sign the JWT using RS256 algorithm with the private key
  // The private key needs to have newlines preserved
  const privateKey = credentials.private_key.replace(/\\n/g, '\n');
  
  const token = jwt.sign(claims, privateKey, {
    algorithm: 'RS256',
  });

  return token;
}

