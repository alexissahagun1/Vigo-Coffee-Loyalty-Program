import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateLoyaltyCardBackground } from '@/lib/loyalty-card/generate-background';
import { readFileSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';

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
  // Add immediate logging that will show even if everything else fails
  console.log('🚨 BACKGROUND ENDPOINT CALLED - Route handler executing');
  console.log('🚨 Request URL:', req.url);
  console.log('🚨 Request method:', req.method);
  
  const startTime = Date.now();
  let userId: string | undefined;
  
  try {
    userId = (await params).userId;
    console.log(`🖼️  Background image request for userId: ${userId}`);
    console.log(`   Request URL: ${req.url}`);
    console.log(`   User-Agent: ${req.headers.get('user-agent') || 'unknown'}`);
    
    // Get user profile to get current points
    // Note: This endpoint must be publicly accessible for Google Wallet to fetch images
    // We use service role client to bypass RLS so Google Wallet can access without authentication
    console.log(`   Fetching profile from database...`);
    const supabase = createServiceRoleClient();
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('points_balance')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.warn(`   ⚠️  Database error: ${error.message}`);
    }
    
    if (error || !profile) {
      // Return a default image or 404 - but for Google Wallet, we should return something
      // Return a default image with 0 points to avoid breaking the pass
      console.warn(`   ⚠️  Profile not found for userId ${userId}, using default image (0 points)`);
    } else {
      console.log(`   ✅ Profile found with ${profile.points_balance || 0} points`);
    }
    
    // Load image assets
    console.log(`   Loading image assets from public folder...`);
    const publicDir = join(process.cwd(), 'public');
    console.log(`   Public directory: ${publicDir}`);
    
    let logoBuffer: Buffer;
    let redTigerBuffer: Buffer;
    let whiteTigerBuffer: Buffer;
    
    try {
      logoBuffer = readFileSync(join(publicDir, 'logo.png'));
      console.log(`   ✅ logo.png loaded (${logoBuffer.length} bytes)`);
    } catch (err: any) {
      console.error(`   ❌ Failed to load logo.png: ${err.message}`);
      throw new Error(`Failed to load logo.png: ${err.message}`);
    }
    
    try {
      redTigerBuffer = readFileSync(join(publicDir, 'tiger-red.png'));
      console.log(`   ✅ tiger-red.png loaded (${redTigerBuffer.length} bytes)`);
    } catch (err: any) {
      console.error(`   ❌ Failed to load tiger-red.png: ${err.message}`);
      throw new Error(`Failed to load tiger-red.png: ${err.message}`);
    }
    
    try {
      whiteTigerBuffer = readFileSync(join(publicDir, 'tiger-white.png'));
      console.log(`   ✅ tiger-white.png loaded (${whiteTigerBuffer.length} bytes)`);
    } catch (err: any) {
      console.error(`   ❌ Failed to load tiger-white.png: ${err.message}`);
      throw new Error(`Failed to load tiger-white.png: ${err.message}`);
    }
    
    // Generate background with current points (use 0 if profile not found)
    const pointsBalance = profile?.points_balance ?? 0;
    console.log(`   Generating background image with ${pointsBalance} points...`);
    const fullBackgroundBuffer = await generateLoyaltyCardBackground(
      pointsBalance,
      logoBuffer,
      redTigerBuffer,
      whiteTigerBuffer
    );
    console.log(`   ✅ Full background image generated (${fullBackgroundBuffer.length} bytes)`);
    
    // For Google Wallet hero image, we only want the top section (black with tigers)
    // Extract only the top 70% which contains the black background and tigers
    // This matches the topSectionHeight calculation in generateLoyaltyCardBackground
    const backgroundMetadata = await sharp(fullBackgroundBuffer).metadata();
    const topSectionHeight = Math.floor((backgroundMetadata.height || 234) * 0.7);
    
    console.log(`   Extracting top section (height: ${topSectionHeight}px) for hero image...`);
    const heroImageBuffer = await sharp(fullBackgroundBuffer)
      .extract({
        left: 0,
        top: 0,
        width: backgroundMetadata.width || 390,
        height: topSectionHeight
      })
      .png()
      .toBuffer();
    
    console.log(`   ✅ Hero image extracted (${heroImageBuffer.length} bytes) - black section with tigers only`);
    
    // Return only the top section (black with tigers) for Google Wallet hero image
    // The timestamp query param in the URL already handles cache busting
    // Convert Buffer to Uint8Array for NextResponse compatibility
    // Add CORS headers to allow Google Wallet to fetch the image
    const responseTime = Date.now() - startTime;
    console.log(`   ✅ Returning hero image (took ${responseTime}ms)`);
    
    return new NextResponse(new Uint8Array(heroImageBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Content-Length': heroImageBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    const errorTime = Date.now() - startTime;
    console.error(`❌ Error generating background image for userId ${userId || 'unknown'}:`, error);
    console.error(`   Error message: ${error.message}`);
    console.error(`   Error stack: ${error.stack}`);
    console.error(`   Failed after ${errorTime}ms`);
    
    // Return a 500 error with details in the response body for debugging
    return new NextResponse(
      JSON.stringify({ 
        error: 'Error generating image',
        message: error.message,
        userId: userId || 'unknown',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}

