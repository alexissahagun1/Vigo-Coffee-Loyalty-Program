import { NextResponse } from 'next/server';

/**
 * Debug endpoint to check environment variable configuration
 * 
 * SECURITY: This endpoint is disabled in production for security reasons.
 * Only available in development/testing environments.
 */
export async function GET() {
  // Disable in production - this is a debug endpoint only
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    hasCert: !!process.env.APPLE_PASS_CERT_BASE64,
    certLength: process.env.APPLE_PASS_CERT_BASE64?.length || 0,
    certPreview: process.env.APPLE_PASS_CERT_BASE64?.substring(0, 30) || 'N/A',
    hasWwdr: !!process.env.APPLE_WWDR_CERT_BASE64,
    wwdrLength: process.env.APPLE_WWDR_CERT_BASE64?.length || 0,
    wwdrPreview: process.env.APPLE_WWDR_CERT_BASE64?.substring(0, 30) || 'N/A',
    hasKey: !!process.env.APPLE_PASS_KEY_BASE64,
    keyLength: process.env.APPLE_PASS_KEY_BASE64?.length || 0,
    hasPassword: !!process.env.APPLE_PASS_PASSWORD,
    // Check Supabase vars too
    hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}

