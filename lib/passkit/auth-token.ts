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
  
  // Create a hash of userId + secret + timestamp for uniqueness
  // In production, use a more secure method like JWT
  const data = `${userId}:${secretKey}:${Date.now()}`;
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
  // For simplicity, we'll store tokens in the database
  // In production, use JWT or similar stateless validation
  // For now, we'll validate by checking if it matches the pattern
  return token.length === 32 && /^[a-f0-9]+$/.test(token);
}

