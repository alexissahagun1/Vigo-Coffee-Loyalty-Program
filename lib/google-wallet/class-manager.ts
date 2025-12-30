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
 * Helper function to update the class background color to black
 * This is called whenever we know the class exists, regardless of how we detected it
 * @param wallet - Wallet client instance
 * @param classId - Class ID to update
 */
async function updateClassBackgroundColor(
  wallet: walletobjects_v1.Walletobjects,
  classId: string
): Promise<void> {
  try {
    // Try to get the current class to check its color
    const classResponse = await wallet.loyaltyclass.get({
      resourceId: classId,
    });
    const existingClass = classResponse.data;
    const currentBgColor = existingClass.hexBackgroundColor;
    const reviewStatus = existingClass.reviewStatus || 'UNKNOWN';
    const isApproved = reviewStatus === 'APPROVED' || reviewStatus === 'approved';
    
    console.log(`   🔍 Checking class background color...`);
    console.log(`      Current color: ${currentBgColor || 'not set'}`);
    console.log(`      Target color: #000000 (black)`);
    console.log(`      Review status: ${reviewStatus}`);
    
    if (currentBgColor !== '#000000') {
      // CRITICAL: Google Wallet does NOT allow updating APPROVED classes via API
      // Once a class is approved, certain fields (like hexBackgroundColor) cannot be changed via API
      // The class must be updated manually in the Google Wallet Console
      if (isApproved) {
        console.error(`   ❌ CANNOT UPDATE: Class is APPROVED. Google Wallet does not allow API updates to approved classes.`);
        console.error(`   📋 ACTION REQUIRED: You must update the background color manually in Google Wallet Console:`);
        console.error(`      1. Go to https://pay.google.com/business/console`);
        console.error(`      2. Navigate to your loyalty class: ${classId}`);
        console.error(`      3. Edit the class and set Background Color to #000000 (black)`);
        console.error(`      4. Save the changes`);
        console.error(`   ⚠️  The pass will continue to show red until this is updated manually.`);
        return; // Don't attempt update - it will fail
      }
      
      console.log(`   🎨 Updating background color from ${currentBgColor || 'not set'} to black...`);
      console.log(`   ℹ️  Class is ${reviewStatus} - API update should work`);
      
      // Try patch first (more efficient, only updates one field)
      try {
        await wallet.loyaltyclass.patch({
          resourceId: classId,
          requestBody: {
            hexBackgroundColor: '#000000', // Only update this field
          },
        });
        console.log(`   ✅ Background color updated to black via PATCH`);
        
        // Verify the update worked
        const verifyResponse = await wallet.loyaltyclass.get({
          resourceId: classId,
        });
        const verifiedColor = verifyResponse.data.hexBackgroundColor;
        if (verifiedColor === '#000000') {
          console.log(`   ✅ Verified: Background color is now black`);
        } else {
          console.warn(`   ⚠️  WARNING: Color update may have failed. Current color: ${verifiedColor}`);
        }
      } catch (patchError: any) {
        console.warn(`   ⚠️  PATCH failed, trying UPDATE method...`);
        console.warn(`      PATCH error: ${patchError.message}`);
        if (patchError.response?.data) {
          console.warn(`      API Error: ${JSON.stringify(patchError.response.data, null, 2)}`);
        }
        
        // If patch fails, try update with only mutable fields
        // IMPORTANT: Don't include reviewStatus - it's read-only and causes errors
        try {
          // Build update object with only fields we can modify
          // Explicitly exclude read-only fields like reviewStatus
          // Use object destructuring to remove reviewStatus
          const { reviewStatus: _, ...mutableClassData } = existingClass;
          
          const updateClass: walletobjects_v1.Schema$LoyaltyClass = {
            id: classId, // Required for update
            hexBackgroundColor: '#000000',
            // Only include fields that exist and are mutable
            ...(mutableClassData.issuerName && { issuerName: mutableClassData.issuerName }),
            ...(mutableClassData.programName && { programName: mutableClassData.programName }),
            ...(mutableClassData.programLogo && { programLogo: mutableClassData.programLogo }),
            ...(mutableClassData.localizedIssuerName && { localizedIssuerName: mutableClassData.localizedIssuerName }),
            ...(mutableClassData.localizedProgramName && { localizedProgramName: mutableClassData.localizedProgramName }),
            ...(mutableClassData.localizedAccountNameLabel && { localizedAccountNameLabel: mutableClassData.localizedAccountNameLabel }),
            // DO NOT include reviewStatus - it's read-only and causes "Invalid review status Optional[APPROVED]" errors
          };
          
          console.log(`   🔍 UPDATE request body (excluding reviewStatus):`, JSON.stringify(updateClass, null, 2));
          
          await wallet.loyaltyclass.update({
            resourceId: classId,
            requestBody: updateClass,
          });
          console.log(`   ✅ Background color updated to black via UPDATE`);
        } catch (updateError: any) {
          console.error(`   ❌ UPDATE also failed: ${updateError.message}`);
          if (updateError.response?.data) {
            console.error(`      API Error: ${JSON.stringify(updateError.response.data, null, 2)}`);
          }
          console.error(`   ⚠️  Background color could not be updated via API.`);
          if (isApproved) {
            console.error(`   📋 ACTION REQUIRED: Update the background color manually in Google Wallet Console.`);
          }
        }
      }
    } else {
      console.log(`   ✅ Background color already set to black`);
    }
  } catch (getError: any) {
    // If we can't get the class, we can't update it - that's okay
    // This might happen if we got a 400/403 error earlier
    console.warn(`   ⚠️  Could not check/update background color: ${getError.message}`);
    if (getError.response?.data) {
      console.warn(`      API Error: ${JSON.stringify(getError.response.data, null, 2)}`);
    }
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
      const classResponse = await wallet.loyaltyclass.get({
        resourceId: classId,
      });
      const existingClass = classResponse.data;
      const reviewStatus = existingClass.reviewStatus || 'UNKNOWN';
      console.log(`✅ Loyalty class already exists: ${classId}`);
      console.log(`   Review Status: ${reviewStatus}`);
      // Check for both uppercase and lowercase (Google returns lowercase 'approved')
      if (reviewStatus !== 'APPROVED' && reviewStatus !== 'approved') {
        console.warn(`   ⚠️  WARNING: Class is ${reviewStatus}, not APPROVED. Passes may not be addable until approved.`);
      }
      
      // Update background color to black if it's not already set correctly
      await updateClassBackgroundColor(wallet, classId);
      
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
        // Try to update background color (may fail if we can't access class, but worth trying)
        await updateClassBackgroundColor(wallet, classId);
        // Return the full classId format - objects MUST reference full resource ID (${issuerId}.${classSuffix})
        return classId;
      } else if (getError.code === 403) {
        // 403 Permission denied - class exists in console but we can't access it via API
        // This can happen even with publishing access if class was created in console
        console.log(`⚠️  Got 403 Permission denied checking class. Class exists in console.`);
        console.log(`   Console shows Class ID suffix: ${classSuffix}`);
        console.log(`   Will use full class ID format for objects: ${classId}`);
        // Try to update background color (may fail with 403, but worth trying)
        await updateClassBackgroundColor(wallet, classId);
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
      // Add localizedAccountNameLabel to define the label for the account name field
      localizedAccountNameLabel: {
        defaultValue: {
          language: 'en-US',
          value: 'Member', // Label for the account name field - actual name comes from object.accountName
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
        // Class exists - try to update background color
        await updateClassBackgroundColor(wallet, classId);
        return classId;
      }
      
      // Check for 403 Permission denied (class exists in console, can't create via API)
      if (insertError.code === 403) {
        console.log(`⚠️  Got 403 Permission denied creating class. Class exists in console.`);
        console.log(`   Will use existing class ID for objects: ${classId}`);
        // Class exists in console - try to update background color
        await updateClassBackgroundColor(wallet, classId);
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
        // Class likely exists - try to update background color
        await updateClassBackgroundColor(wallet, classId);
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
    hexBackgroundColor: '#000000', // Black background
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

