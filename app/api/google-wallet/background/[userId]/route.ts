import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateLoyaltyCardBackground } from '@/lib/loyalty-card/generate-background';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * GET /api/google-wallet/background/[userId]
 * 
 * Serves the dynamically generated background image with tigers for a user.
 * This endpoint generates the image on-demand based on the user's current points.
 * Used as the heroImage URL for Google Wallet passes.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    // Get user profile to get current points
    // Note: This endpoint must be publicly accessible for Google Wallet to fetch images
    // We use service role client to bypass RLS so Google Wallet can access without authentication
    const supabase = createServiceRoleClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('points_balance')
      .eq('id', userId)
      .single();
    
    if (error || !profile) {
      // Return a default image or 404 - but for Google Wallet, we should return something
      // Return a default image with 0 points to avoid breaking the pass
      console.warn(`Profile not found for userId ${userId}, using default image`);
    }
    
    // Load image assets
    const logoBuffer = readFileSync(join(process.cwd(), 'public', 'logo.png'));
    const redTigerBuffer = readFileSync(join(process.cwd(), 'public', 'tiger-red.png'));
    const whiteTigerBuffer = readFileSync(join(process.cwd(), 'public', 'tiger-white.png'));
    
    // Generate background with current points (use 0 if profile not found)
    const pointsBalance = profile?.points_balance ?? 0;
    const backgroundBuffer = await generateLoyaltyCardBackground(
      pointsBalance,
      logoBuffer,
      redTigerBuffer,
      whiteTigerBuffer
    );
    
    // Return image with cache-busting headers
    // The timestamp query param in the URL already handles cache busting
    // Convert Buffer to Uint8Array for NextResponse compatibility
    // Add CORS headers to allow Google Wallet to fetch the image
    return new NextResponse(new Uint8Array(backgroundBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    });
  } catch (error: any) {
    console.error('Error generating background image:', error);
    return new NextResponse('Error generating image', { status: 500 });
  }
}

