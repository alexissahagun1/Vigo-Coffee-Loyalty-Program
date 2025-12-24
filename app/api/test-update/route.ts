import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { notifyPassUpdate } from "@/lib/passkit/push-notifications";

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
    
    // Now try with .single()
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('points_balance')
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

    // Immediately trigger push notification
    const notifiedCount = await notifyPassUpdate(userId);
    
    console.log(`📱 Push notification triggered for ${userId}`);
    console.log(`   Devices notified: ${notifiedCount}`);

    return NextResponse.json({
      success: true,
      userId,
      oldPoints: profile.points_balance,
      newPoints: newPoints,
      pointsAdded: pointsToAdd,
      devicesNotified: notifiedCount,
      message: `Points updated! New balance: ${newPoints}. Notified ${notifiedCount} device(s).`,
    });
  } catch (error: any) {
    console.error('❌ Test update error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}

