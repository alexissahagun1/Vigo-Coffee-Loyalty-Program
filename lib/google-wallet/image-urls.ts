/**
 * Image URL Helper for Google Wallet
 * 
 * Google Wallet requires publicly accessible image URLs.
 * This module provides utilities to generate image URLs for passes.
 */

/**
 * Gets the base URL for the application
 * @returns Base URL (e.g., https://yourdomain.com or http://localhost:3000)
 */
export function getBaseUrl(): string {
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
    'http://localhost:3000');
  
  // Ensure baseUrl has protocol
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }
  
  return baseUrl;
}

/**
 * Checks if the base URL is publicly accessible (not localhost)
 * @param baseUrl - Base URL to check
 * @returns true if URL is publicly accessible
 */
export function isPublicUrl(baseUrl: string): boolean {
  return !baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1');
}

/**
 * Gets the public URL for an image asset
 * @param imagePath - Path to image in public folder (e.g., 'logo.png')
 * @returns Full public URL
 */
export function getImageUrl(imagePath: string): string {
  const baseUrl = getBaseUrl();
  // Remove leading slash if present to avoid double slashes
  const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
  return `${baseUrl}/${cleanPath}`;
}

/**
 * Gets URLs for all required Google Wallet images
 * @returns Object with image URLs
 */
export function getWalletImageUrls(): {
  logo: string;
  hero: string;
  background: string;
} {
  const baseUrl = getBaseUrl();
  
  return {
    logo: getImageUrl('logo.png'),
    hero: getImageUrl('tiger-red.png'), // Use tiger as hero image
    background: getImageUrl('logo.png'), // Will be replaced with generated background
  };
}

/**
 * Generates a data URL for an image buffer (for generated images like tiger background)
 * Note: Google Wallet prefers public URLs, but data URLs can be used for dynamic images
 * @param buffer - Image buffer
 * @param mimeType - MIME type (default: 'image/png')
 * @returns Data URL string
 */
export function bufferToDataUrl(buffer: Buffer, mimeType: string = 'image/png'): string {
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

