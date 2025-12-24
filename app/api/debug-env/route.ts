import { NextResponse } from 'next/server';

export async function GET() {
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

