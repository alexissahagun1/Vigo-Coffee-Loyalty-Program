import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
// Apple Wallet: Push notification system (APNs)
import { notifyPassUpdate } from "@/lib/passkit/push-notifications";
// Google Wallet: Direct API update system
import { updateGoogleWalletPass, hasGoogleWalletPass } from "@/lib/google-wallet/pass-updater";

/**
 * Test endpoint to immediately update points and trigger push notification
 * POST /api/test-update
 * Body: { userId: string, points: number }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId;
    const pointsToAdd = body.points || 1;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    let supabase;
    try {
      supabase = createServiceRoleClient();
      
      // Verify service role key is set
      const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      const keyLength = process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0;
      console.log(`🔑 Service role key check:`, {
        exists: hasServiceRoleKey,
        length: keyLength,
        firstChars: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) || 'missing'
      });
      
      if (!hasServiceRoleKey) {
        return NextResponse.json({ 
          error: 'Server configuration error', 
          details: 'SUPABASE_SERVICE_ROLE_KEY environment variable is missing',
          hint: 'Add SUPABASE_SERVICE_ROLE_KEY to Vercel environment variables'
        }, { status: 500 });
      }
    } catch (clientError: any) {
      console.error('❌ Failed to create service role client:', clientError.message);
      return NextResponse.json({ 
        error: 'Server configuration error', 
        details: clientError.message,
        hint: 'SUPABASE_SERVICE_ROLE_KEY may be missing in Vercel environment variables'
      }, { status: 500 });
    }

    // Get current points
    console.log(`🔍 Querying profiles table for userId: ${userId}`);
    console.log(`🔍 Using service role client - should bypass RLS`);
    
    // First, try without .single() to see if we get any results
    const { data: allProfiles, error: testError } = await supabase
      .from('profiles')
      .select('id, points_balance')
      .eq('id', userId)
      .limit(5);
    
    console.log(`📊 Test query (without .single()):`, { 
      count: allProfiles?.length || 0,
      data: allProfiles,
      error: testError?.message 
    });
    
    // Now try with .single() - need full profile for wallet updates
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    console.log(`📊 Query result:`, { 
      hasData: !!profile, 
      error: fetchError?.message,
      errorCode: fetchError?.code,
      errorDetails: fetchError?.details,
      errorHint: fetchError?.hint
    });

    if (fetchError) {
      console.error('❌ Database error:', fetchError);
      return NextResponse.json({ 
        error: 'Database error', 
        details: fetchError.message,
        code: fetchError.code,
        hint: fetchError.hint
      }, { status: 500 });
    }

    if (!profile) {
      console.error(`❌ User not found: ${userId}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newPoints = (profile.points_balance || 0) + pointsToAdd;

    // Update points - try with updated_at first, fallback without it if schema cache hasn't refreshed
    let updateResult = await supabase
      .from('profiles')
      .update({
        points_balance: newPoints,
        updated_at: new Date().toISOString(), // Update timestamp for PassKit If-Modified-Since
      })
      .eq('id', userId)
      .select()
      .single();

    // If update failed due to schema cache issue (updated_at column not found), retry without it
    if (updateResult.error && updateResult.error.message?.includes("updated_at")) {
      updateResult = await supabase
        .from('profiles')
        .update({
          points_balance: newPoints,
        })
        .eq('id', userId)
        .select()
        .single();
    }

    const { data: updatedProfile, error: updateError } = updateResult;

    if (updateError || !updatedProfile) {
      return NextResponse.json({ error: 'Failed to update points' }, { status: 500 });
    }

    console.log(`✅ Points updated: ${userId} now has ${newPoints} points`);

    // ============================================
    // DETECT WHICH WALLET SYSTEM CUSTOMER USES
    // ============================================
    // Check both wallet systems in parallel for better performance
    // Use fail-safe approach: if check fails, still try to update
    const passTypeIdentifier = process.env.PASS_TYPE_ID || 'pass.com.vigocoffee.loyalty';
    
    // Helper function to add timeout to Google Wallet check
    const checkGoogleWalletWithTimeout = async (userId: string): Promise<boolean> => {
      try {
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), 2000); // 2 second timeout
        });
        const checkPromise = hasGoogleWalletPass(userId);
        return await Promise.race([checkPromise, timeoutPromise]);
      } catch (error) {
        console.error('🤖 [GOOGLE WALLET] Error checking pass existence:', error);
        return false; // Fail-safe: return false, will still try to update
      }
    };

    // Run both checks in parallel
    const [appleCheckResult, googleCheckResult] = await Promise.allSettled([
      // Check Apple Wallet: Look for registrations in pass_registrations table
      supabase
        .from('pass_registrations')
        .select('serial_number')
        .eq('serial_number', userId)
        .eq('pass_type_identifier', passTypeIdentifier)
        .limit(1)
        .then(result => (result.data?.length || 0) > 0),
      // Check Google Wallet: Use API call with timeout
      checkGoogleWalletWithTimeout(userId)
    ]);

    // Extract results with fail-safe defaults
    const hasAppleWallet = appleCheckResult.status === 'fulfilled' ? appleCheckResult.value : false;
    const hasGoogleWallet = googleCheckResult.status === 'fulfilled' ? googleCheckResult.value : false;

    // Log detection results
    console.log(`🔍 Wallet detection for user ${userId}:`);
    console.log(`   Apple Wallet: ${hasAppleWallet ? 'YES' : 'NO'}${appleCheckResult.status === 'rejected' ? ' (check failed, will try anyway)' : ''}`);
    console.log(`   Google Wallet: ${hasGoogleWallet ? 'YES' : 'NO'}${googleCheckResult.status === 'rejected' ? ' (check failed, will try anyway)' : ''}`);

    // ============================================
    // APPLE WALLET UPDATE (Push Notifications)
    // ============================================
    // Apple Wallet uses APNs push notifications to notify devices that the pass has been updated.
    // Apple's servers will then fetch the updated pass from our server.
    // This is completely separate from Google Wallet updates.
    let appleWalletNotifiedCount = 0;
    if (hasAppleWallet) {
      try {
        console.log(`🍎 [APPLE WALLET] Starting Apple Wallet pass update for user ${userId}...`);
        appleWalletNotifiedCount = await notifyPassUpdate(userId);
        console.log(`🍎 [APPLE WALLET] Update notification sent to ${appleWalletNotifiedCount} device(s)`);
        console.log(`🍎 [APPLE WALLET] Apple Wallet update completed successfully`);
      } catch (appleWalletError: any) {
        console.error('🍎 [APPLE WALLET] Push notification failed (non-critical):', appleWalletError?.message);
        console.error('   Stack:', appleWalletError?.stack);
      }
    } else {
      console.log(`🍎 [APPLE WALLET] Skipping update - user does not have Apple Wallet pass`);
    }

    // ============================================
    // GOOGLE WALLET UPDATE (Direct API Call)
    // ============================================
    // Google Wallet uses direct API calls to update passes immediately.
    // This is completely separate from Apple Wallet push notifications.
    // Google Wallet updates happen synchronously via their REST API.
    let googleWalletUpdated = false;
    if (hasGoogleWallet) {
      try {
        console.log(`🤖 [GOOGLE WALLET] Starting Google Wallet pass update for user ${userId}...`);
        console.log(`🤖 [GOOGLE WALLET] User points: ${updatedProfile.points_balance}`);
        console.log(`🤖 [GOOGLE WALLET] User name: ${updatedProfile.full_name}`);
        
        googleWalletUpdated = await updateGoogleWalletPass(userId, {
          id: userId,
          full_name: updatedProfile.full_name,
          points_balance: updatedProfile.points_balance,
          redeemed_rewards: updatedProfile.redeemed_rewards,
        });
        
        if (googleWalletUpdated) {
          console.log(`🤖 [GOOGLE WALLET] Google Wallet pass updated successfully`);
        } else {
          console.log(`🤖 [GOOGLE WALLET] Google Wallet pass update failed`);
        }
      } catch (googleWalletError: any) {
        console.error('🤖 [GOOGLE WALLET] Google Wallet update failed (non-critical):', googleWalletError?.message);
        console.error('   Stack:', googleWalletError?.stack);
      }
    } else {
      console.log(`🤖 [GOOGLE WALLET] Skipping update - user does not have Google Wallet pass`);
    }

    return NextResponse.json({
      success: true,
      userId,
      oldPoints: profile.points_balance,
      newPoints: newPoints,
      pointsAdded: pointsToAdd,
      appleWallet: {
        devicesNotified: appleWalletNotifiedCount,
        status: appleWalletNotifiedCount > 0 ? 'success' : 'no_devices_or_failed'
      },
      googleWallet: {
        updated: googleWalletUpdated,
        status: googleWalletUpdated ? 'success' : 'not_found_or_failed'
      },
      message: `Points updated! New balance: ${newPoints}. Apple: ${appleWalletNotifiedCount} device(s), Google: ${googleWalletUpdated ? 'updated' : 'not found'}.`,
    });
  } catch (error: any) {
    console.error('❌ Test update error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}

