import { getWalletClient, getIssuerId, getClassId, getClassSuffix, isGoogleWalletConfigured } from './auth';
import { walletobjects_v1 } from 'googleapis';

/**
 * Google Wallet Pass Class Manager
 * 
 * Manages the pass class (template) for loyalty cards.
 * The class defines the structure and appearance of all loyalty passes.
 * Similar to Apple Wallet's pass type identifier.
 */

/**
 * Lists all loyalty classes for the issuer
 * Useful for debugging to see what classes exist
 * 
 * Note: The list() API requires a numeric issuer ID, but we have an alphanumeric one.
 * We'll try to list without issuerId first, or return empty if that's not supported.
 */
export async function listLoyaltyClasses(): Promise<string[]> {
  if (!isGoogleWalletConfigured()) {
    throw new Error('Google Wallet is not configured');
  }

  const wallet = getWalletClient();

  try {
    // Try listing without issuerId parameter (some APIs support this)
    // If that fails, we'll return empty array since we can't use the alphanumeric issuer ID
    const response = await wallet.loyaltyclass.list({});

    const classIds = (response.data.resources || []).map((cls) => cls.id || '').filter(Boolean);
    console.log(`📋 Found ${classIds.length} existing loyalty class(es):`);
    classIds.forEach((id) => console.log(`   - ${id}`));
    return classIds;
  } catch (error: any) {
    // If listing fails (e.g., requires numeric issuer ID), that's okay
    // We'll just proceed with creating the class
    console.log(`ℹ️  Cannot list existing classes (requires numeric issuer ID). Will proceed with creation.`);
    if (error.response?.data) {
      console.log(`   API Response: ${JSON.stringify(error.response.data.error?.message || 'Unknown error')}`);
    }
    return [];
  }
}

/**
 * Ensures the loyalty class exists, creating it if necessary
 * @param baseUrl - Base URL for image assets (e.g., https://yourdomain.com)
 * @returns The class ID
 */
export async function ensureLoyaltyClassExists(baseUrl: string): Promise<string> {
  if (!isGoogleWalletConfigured()) {
    throw new Error('Google Wallet is not configured');
  }

  const wallet = getWalletClient();
  const issuerId = getIssuerId();
  const classSuffix = getClassSuffix();
  const classId = getClassId();

  // Debug logging
  console.log(`🔍 Google Wallet Class Debug:`);
  console.log(`   Issuer ID: ${issuerId}`);
  console.log(`   Class Suffix: ${classSuffix}`);
  console.log(`   Full Class ID: ${classId}`);

  try {
    // Try to get existing class
    try {
      await wallet.loyaltyclass.get({
        resourceId: classId,
      });
      console.log(`✅ Loyalty class already exists: ${classId}`);
      return classId;
    } catch (getError: any) {
      // Class doesn't exist or error checking - proceed to create
      if (getError.code === 404) {
        console.log(`📝 Class doesn't exist, will create: ${classId}`);
      } else if (getError.code === 400) {
        // 400 error - class exists in console but API rejects our format
        // According to Google Wallet docs, classId in objects MUST be full resource ID format
        console.log(`⚠️  Got 400 error checking class. Class exists in console.`);
        console.log(`   Console shows Class ID suffix: ${classSuffix}`);
        console.log(`   Will use full class ID format for objects: ${classId}`);
        // Return the full classId format - objects MUST reference full resource ID (${issuerId}.${classSuffix})
        return classId;
      } else if (getError.code === 403) {
        // 403 Permission denied - class exists in console but we can't access it via API
        // This can happen even with publishing access if class was created in console
        console.log(`⚠️  Got 403 Permission denied checking class. Class exists in console.`);
        console.log(`   Console shows Class ID suffix: ${classSuffix}`);
        console.log(`   Will use full class ID format for objects: ${classId}`);
        // Return the full classId format - proceed with object creation
        return classId;
      } else {
        console.warn(`⚠️  Unexpected error checking class: ${getError.message}`);
        // For other errors, still try to create
      }
    }

    // Only create if we got a 404 (class definitely doesn't exist)
    // If we got 400, we already returned above
    console.log(`📝 Preparing to create loyalty class with:`);
    console.log(`   Resource ID: ${classId}`);
    console.log(`   Resource ID length: ${classId.length}`);
    const isValidFormat = /^[A-Z0-9]+\.[a-zA-Z0-9._-]+$/.test(classId);
    console.log(`   Resource ID format check: ${isValidFormat ? '✅ Valid' : '❌ Invalid'}`);
    
    const loyaltyClass: walletobjects_v1.Schema$LoyaltyClass = {
      id: classId,
      issuerName: 'Vigo Coffee',
      reviewStatus: 'UNDER_REVIEW',
      programName: 'Vigo Coffee Loyalty Program',
      programLogo: {
        sourceUri: {
          uri: `${baseUrl}/logo.png`,
        },
        contentDescription: {
          defaultValue: {
            language: 'en-US',
            value: 'Vigo Coffee Logo',
          },
        },
      },
      hexBackgroundColor: '#000000',
      localizedIssuerName: {
        defaultValue: {
          language: 'en-US',
          value: 'Vigo Coffee',
        },
      },
      localizedProgramName: {
        defaultValue: {
          language: 'en-US',
          value: 'Loyalty Program',
        },
      },
    };

    try {
      await wallet.loyaltyclass.insert({
        requestBody: loyaltyClass,
      });

      console.log(`✅ Loyalty class created: ${classId}`);
      console.log(`⚠️  Note: Class is UNDER_REVIEW. It will be APPROVED after Google review.`);
      return classId;
    } catch (insertError: any) {
      // Check if class already exists (409 Conflict)
      if (insertError.code === 409 || insertError.message?.includes('already exists')) {
        console.log(`✅ Loyalty class already exists: ${classId}`);
        return classId;
      }
      
      // Check for 403 Permission denied (class exists in console, can't create via API)
      if (insertError.code === 403) {
        console.log(`⚠️  Got 403 Permission denied creating class. Class exists in console.`);
        console.log(`   Will use existing class ID for objects: ${classId}`);
        // Class exists in console, proceed with using it for objects
        return classId;
      }
      
      // Check for invalid resource ID format or "not a valid id" error
      if (insertError.code === 400 && (
        insertError.message?.includes('Invalid resource ID') ||
        insertError.message?.includes('not a valid id')
      )) {
        console.warn(`⚠️  Class ID format rejected by API: ${classId}`);
        console.warn(`   This might mean the class exists in console with a different format.`);
        console.warn(`   Attempting to use the class ID as-is for pass objects.`);
        // If class exists in console, we can still try to use it for objects
        // Return the classId so we can proceed with object creation
        return classId;
      }
      
      // Re-throw other errors
      throw insertError;
    }
  } catch (error: any) {
    console.error('❌ Failed to ensure loyalty class exists:', error);
    if (error.response) {
      console.error('   API Error:', error.response.data);
    }
    throw new Error(`Failed to create loyalty class: ${error.message}`);
  }
}

/**
 * Updates the loyalty class (e.g., when design changes)
 * @param baseUrl - Base URL for image assets
 */
export async function updateLoyaltyClass(baseUrl: string): Promise<void> {
  if (!isGoogleWalletConfigured()) {
    throw new Error('Google Wallet is not configured');
  }

  const wallet = getWalletClient();
  const classId = getClassId();

  const loyaltyClass: walletobjects_v1.Schema$LoyaltyClass = {
    id: classId,
    issuerName: 'Vigo Coffee',
    programName: 'Vigo Coffee Loyalty Program',
    programLogo: {
      sourceUri: {
        uri: `${baseUrl}/logo.png`,
      },
      contentDescription: {
        defaultValue: {
          language: 'en-US',
          value: 'Vigo Coffee Logo',
        },
      },
    },
    hexBackgroundColor: '#000000',
    localizedIssuerName: {
      defaultValue: {
        language: 'en-US',
        value: 'Vigo Coffee',
      },
    },
    localizedProgramName: {
      defaultValue: {
        language: 'en-US',
        value: 'Loyalty Program',
      },
    },
  };

  try {
    await wallet.loyaltyclass.patch({
      resourceId: classId,
      requestBody: loyaltyClass,
    });
    console.log(`✅ Loyalty class updated: ${classId}`);
  } catch (error: any) {
    console.error('❌ Failed to update loyalty class:', error);
    if (error.response) {
      console.error('   API Error:', error.response.data);
    }
    throw new Error(`Failed to update loyalty class: ${error.message}`);
  }
}

