import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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

    const supabase = await createClient();

    // Get current points
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('points_balance')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newPoints = (profile.points_balance || 0) + pointsToAdd;

    // Update points
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        points_balance: newPoints,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

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

