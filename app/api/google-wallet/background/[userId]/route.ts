import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('points_balance')
      .eq('id', userId)
      .single();
    
    if (!profile) {
      return new NextResponse('User not found', { status: 404 });
    }
    
    // Load image assets
    const logoBuffer = readFileSync(join(process.cwd(), 'public', 'logo.png'));
    const redTigerBuffer = readFileSync(join(process.cwd(), 'public', 'tiger-red.png'));
    const whiteTigerBuffer = readFileSync(join(process.cwd(), 'public', 'tiger-white.png'));
    
    // Generate background with current points
    const backgroundBuffer = await generateLoyaltyCardBackground(
      profile.points_balance || 0,
      logoBuffer,
      redTigerBuffer,
      whiteTigerBuffer
    );
    
    // Return image with cache-busting headers
    // The timestamp query param in the URL already handles cache busting
    return new NextResponse(backgroundBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    console.error('Error generating background image:', error);
    return new NextResponse('Error generating image', { status: 500 });
  }
}

