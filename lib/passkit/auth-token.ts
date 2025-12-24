import crypto from 'crypto';

/**
 * Generates an authentication token for Apple Wallet pass web service
 * This token is used by Apple to authenticate requests for pass updates
 * 
 * @param userId - The user's unique ID (used as serial number)
 * @param secret - Secret key for token generation (from env or default)
 * @returns A secure authentication token
 */
export function generateAuthToken(userId: string, secret?: string): string {
  const secretKey = secret || process.env.PASS_AUTH_SECRET || 'default-secret-change-in-production';
  
  // Create a deterministic hash of userId + secret (NO timestamp!)
  // Apple will send this token back, so it must be the same every time
  // The token should be unique per user but consistent for the same user
  const data = `${userId}:${secretKey}`;
  const token = crypto
    .createHash('sha256')
    .update(data)
    .digest('hex')
    .substring(0, 32); // Use first 32 chars as token
  
  return token;
}

/**
 * Validates an authentication token
 * 
 * @param token - The token to validate
 * @param userId - The user's ID
 * @param secret - Secret key used for generation
 * @returns True if token is valid
 */
export function validateAuthToken(token: string, userId: string, secret?: string): boolean {
  // Validate by regenerating the token and comparing
  // Since the token is deterministic (no timestamp), we can validate it
  const expectedToken = generateAuthToken(userId, secret);
  return token === expectedToken && token.length === 32 && /^[a-f0-9]+$/.test(token);
}

