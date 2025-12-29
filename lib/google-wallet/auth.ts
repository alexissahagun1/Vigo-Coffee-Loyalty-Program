import { google } from 'googleapis';
import { walletobjects_v1 } from 'googleapis';

/**
 * Google Wallet API Authentication
 * 
 * This module handles authentication with Google Wallet API using service account credentials.
 * Similar to how Apple Wallet uses certificates, Google Wallet uses OAuth2 service account.
 */

let walletClient: walletobjects_v1.Walletobjects | null = null;

/**
 * Gets or creates the Google Wallet API client
 * @returns Google Wallet API client instance
 */
export function getWalletClient(): walletobjects_v1.Walletobjects {
  if (walletClient) {
    return walletClient;
  }

  // Check if Google Wallet is configured
  if (!isGoogleWalletConfigured()) {
    throw new Error('Google Wallet is not configured. Please set required environment variables.');
  }

  try {
    // Decode Base64 service account key
    const serviceAccountKeyBase64 = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_BASE64;
    if (!serviceAccountKeyBase64) {
      throw new Error('GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_BASE64 is not set');
    }

    const serviceAccountKeyJson = Buffer.from(serviceAccountKeyBase64, 'base64').toString('utf-8');
    const serviceAccountKey = JSON.parse(serviceAccountKeyJson);

    // Create auth client with service account credentials
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccountKey.client_email || process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL,
        private_key: serviceAccountKey.private_key,
        project_id: serviceAccountKey.project_id,
      },
      scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
    });

    // Create Wallet API client
    walletClient = google.walletobjects({
      version: 'v1',
      auth: auth,
    });

    return walletClient;
  } catch (error: any) {
    console.error('❌ Failed to initialize Google Wallet client:', error.message);
    throw new Error(`Google Wallet authentication failed: ${error.message}`);
  }
}

/**
 * Checks if Google Wallet is properly configured
 * @returns True if all required environment variables are set
 */
export function isGoogleWalletConfigured(): boolean {
  return !!(
    process.env.GOOGLE_WALLET_ISSUER_ID &&
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY_BASE64
  );
}

/**
 * Gets the issuer ID from environment variables
 * @returns Issuer ID or throws error if not configured
 */
export function getIssuerId(): string {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  if (!issuerId) {
    throw new Error('GOOGLE_WALLET_ISSUER_ID is not configured');
  }
  return issuerId;
}

/**
 * Gets the class suffix from environment variables (without issuer ID)
 * @returns Class suffix for loyalty passes (e.g., 'loyalty.vigocoffee.com')
 * 
 * Note: Google Wallet class suffixes can contain dots, underscores, and hyphens
 * as shown in the Google Wallet Console
 */
export function getClassSuffix(): string {
  let classSuffix = process.env.GOOGLE_WALLET_CLASS_ID || 'loyaltyvigocoffee';
  
  // If user provided full resource ID (issuerId.suffix), extract just the suffix
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  if (issuerId && classSuffix.startsWith(issuerId + '.')) {
    classSuffix = classSuffix.substring(issuerId.length + 1);
  }
  
  // Google Wallet class suffixes can contain: alphanumeric, periods, underscores, hyphens
  // Keep dots, underscores, and hyphens to match classes created in the console
  // Only remove truly invalid characters (spaces, special symbols, etc.)
  classSuffix = classSuffix.replace(/[^a-zA-Z0-9._-]/g, '');
  
  // Ensure it's not empty and has reasonable length
  if (!classSuffix || classSuffix.length < 3) {
    classSuffix = 'loyaltyvigocoffee';
  }
  
  // Limit length to 50 characters (Google Wallet requirement)
  if (classSuffix.length > 50) {
    classSuffix = classSuffix.substring(0, 50);
  }
  
  return classSuffix;
}

/**
 * Gets the full class resource ID (issuerId.classSuffix format)
 * This is the format required by Google Wallet API for resource IDs
 * @returns Full class resource ID (e.g., 'BCR2DN4TU7FKTMRB.loyalty_vigocoffee')
 */
export function getClassId(): string {
  const issuerId = getIssuerId();
  const classSuffix = getClassSuffix();
  return `${issuerId}.${classSuffix}`;
}

