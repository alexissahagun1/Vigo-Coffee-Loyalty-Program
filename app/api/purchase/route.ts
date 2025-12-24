import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const POINTS_PER_PURCHASE = 1; // 1 point per purchase
const POINTS_FOR_COFFEE = 10; // 10 points for a coffee
const POINTS_FOR_MEAL = 25; // 25 points for a meal

export async function POST(req: NextRequest) {
    try {
        // Get customer ID from request body
        const body = await req.json();
        const customerId = body.customerId || body.userId;

        // Validate that we have a customerID
        if (!customerId || typeof customerId !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid customerId'},
                { status: 400 }
            );
        }
        // Connect to Supabase database
        const supabase = await createClient();

        // Find customer in database
        const result = await supabase
            .from('profiles')
            .select('*')
            .eq('id', customerId)
            .single();

        // Extract data and error from result
        const profile = result.data;
        const profileError = result.error;

        // Check if customer was not found
        if (profileError || !profile) {
            return NextResponse.json(
                { error: 'Customer not found', details: profileError?.message},
                { status: 404 }
            );
        }
        // calculate new values
        // get current values from profile with fallback to 0 if null
        const currentPoints = profile.points_balance || 0;
        const currentPurchases = profile.total_purchases || 0;

        // Calculate new values, add 1 point and 1 purchase.
        const newPointsBalance = currentPoints + POINTS_PER_PURCHASE;
        const newTotalPurchases = currentPurchases + 1;

        // Check if customer earned a reward
        let rewardEarned = false;
        let rewardType = null;

        // Check meal first (higher value reward)
        if (newPointsBalance >= POINTS_FOR_MEAL && newPointsBalance % POINTS_FOR_MEAL === 0) {
            rewardEarned = true;
            rewardType = 'meal';
        }
        // Then check coffee
        else if (newPointsBalance >= POINTS_FOR_COFFEE && newPointsBalance % POINTS_FOR_COFFEE === 0) {
            rewardEarned = true;
            rewardType = 'coffee';
        }
        else {
            rewardEarned = false;
            rewardType = null;
        }
        // Update customer profile in database
        const updateResult = await supabase
            .from('profiles')
            .update({
                points_balance: newPointsBalance,
                total_purchases: newTotalPurchases,
                updated_at: new Date().toISOString(),
            })
            .eq('id', customerId)
            .select()
            .single();
            
        // Extract updated data
        const updatedProfile = updateResult.data;
        const updatedError = updateResult.error;

        // Check if update failed
        if (updatedError || !updatedProfile) {
            return NextResponse.json(
                { error: 'Failed to update profile', details: updatedError?.message},
                { status: 500 }
            );
        }

        // Return success response
        return NextResponse.json({
            success: true,
            customer: {
                id: updatedProfile.id,
                name: updatedProfile.full_name || 'Customer',            
                total_purchases: updatedProfile.total_purchases,
                points_balance: updatedProfile.points_balance,
            },
            pointsEarned: POINTS_PER_PURCHASE,
            rewardEarned: rewardEarned,
            rewardType: rewardType,
            message: `Purchase recorded!  ${updatedProfile.full_name} New balance: ${updatedProfile.points_balance} points`,
        });


    } catch (error: any) {
        console.error('❌ Purchase processing error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error?.message},
            { status: 500 }
        );
    }
}