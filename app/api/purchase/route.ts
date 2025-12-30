import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, createClient } from "@/lib/supabase/server";
// Apple Wallet: Push notification system (APNs)
import { notifyPassUpdate, notifyRewardEarned } from "@/lib/passkit/push-notifications";
// Google Wallet: Direct API update system
import { updateGoogleWalletPass, hasGoogleWalletPass } from "@/lib/google-wallet/pass-updater";
import { requireEmployeeAuth } from "@/lib/auth/employee-auth";

const POINTS_PER_PURCHASE = 1; // 1 point per purchase
const POINTS_FOR_COFFEE = 10; // 10 points for a coffee
const POINTS_FOR_MEAL = 25; // 25 points for a meal

export async function POST(req: NextRequest) {
    console.log(`🛒 [PURCHASE] Purchase endpoint called`);
    try {
        // SECURITY: Require employee authentication
        const authError = await requireEmployeeAuth();
        if (authError) {
            console.log(`🛒 [PURCHASE] Authentication failed`);
            return authError;
        }
        console.log(`🛒 [PURCHASE] Authentication passed`);

        // Get customer ID from request body
        const body = await req.json();
        const customerId = body.customerId || body.userId;
        console.log(`🛒 [PURCHASE] Processing purchase for customer: ${customerId}`);

        // Validate that we have a customerID
        if (!customerId || typeof customerId !== 'string') {
            return NextResponse.json(
                { error: 'Missing or invalid customerId'},
                { status: 400 }
            );
        }
        // Connect to Supabase database with service role to bypass RLS
        // This allows the API to update customer points without user authentication
        const supabase = createServiceRoleClient();

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
        // Normalize to numbers (JSONB might return strings or null)
        const currentPoints = Number(profile.points_balance) || 0;
        const currentPurchases = Number(profile.total_purchases) || 0;

        // Calculate new values, add 1 point and 1 purchase.
        const newPointsBalance = currentPoints + POINTS_PER_PURCHASE;
        const newTotalPurchases = currentPurchases + 1;

        // Check if customer earned a reward
        // Note: Customer can earn BOTH meal and coffee at overlapping thresholds (50, 100, etc.)
        let rewardEarned = false;
        let rewardType = null;
        let earnedMeal = false;
        let earnedCoffee = false;

        // Check meal first (higher value reward)
        if (newPointsBalance >= POINTS_FOR_MEAL && newPointsBalance % POINTS_FOR_MEAL === 0) {
            earnedMeal = true;
            rewardEarned = true;
            rewardType = 'meal'; // Prioritize meal for notification
        }
        
        // Check coffee (can be earned simultaneously with meal at 50, 100, etc.)
        if (newPointsBalance >= POINTS_FOR_COFFEE && newPointsBalance % POINTS_FOR_COFFEE === 0) {
            earnedCoffee = true;
            // Only set rewardEarned/rewardType if meal wasn't already earned
            // (meal takes priority for notification, but both are available)
            if (!earnedMeal) {
                rewardEarned = true;
                rewardType = 'coffee';
            }
        }
        
        // If both rewards earned, prioritize meal notification but both are available
        // The scan page will show both as available rewards
        // Update customer profile in database
        // Try with updated_at first, fallback without it if schema cache hasn't refreshed
        let updateResult = await supabase
            .from('profiles')
            .update({
                points_balance: newPointsBalance,
                total_purchases: newTotalPurchases,
                updated_at: new Date().toISOString(), // Current timestamp (needed for PassKit If-Modified-Since)
            })
            .eq('id', customerId)
            .select()
            .single();

        // If update failed due to schema cache issue (updated_at column not found), retry without it
        if (updateResult.error && updateResult.error.message?.includes("updated_at")) {
            updateResult = await supabase
                .from('profiles')
                .update({
                    points_balance: newPointsBalance,
                    total_purchases: newTotalPurchases,
                })
                .eq('id', customerId)
                .select()
                .single();
        }
            
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

        // Get employee_id from authenticated user (if available)
        let employeeId: string | null = null;
        try {
            const authSupabase = await createClient();
            const { data: { user } } = await authSupabase.auth.getUser();
            if (user) {
                // Verify user is an employee
                const { data: employee } = await supabase
                    .from('employees')
                    .select('id')
                    .eq('id', user.id)
                    .single();
                if (employee) {
                    employeeId = user.id;
                }
            }
        } catch (err) {
            // Employee ID is optional, continue without it
            console.log('Could not get employee ID:', err);
        }

        // Log transaction
        try {
            const { error: transactionError } = await supabase
                .from('transactions')
                .insert({
                    customer_id: customerId,
                    employee_id: employeeId,
                    type: 'purchase',
                    points_change: POINTS_PER_PURCHASE,
                    points_balance_after: newPointsBalance,
                    reward_points_threshold: null,
                });
            
            if (transactionError) {
                // Don't fail the purchase if transaction logging fails
                console.error('⚠️  Transaction logging failed (non-critical):', transactionError.message, transactionError);
            }
        } catch (transactionError: any) {
            // Don't fail the purchase if transaction logging fails
            console.error('⚠️  Transaction logging failed (non-critical):', transactionError?.message);
        }

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
                .eq('serial_number', customerId)
                .eq('pass_type_identifier', passTypeIdentifier)
                .limit(1)
                .then(result => (result.data?.length || 0) > 0),
            // Check Google Wallet: Use API call with timeout
            checkGoogleWalletWithTimeout(customerId)
        ]);

        // Extract results with fail-safe defaults
        const hasAppleWallet = appleCheckResult.status === 'fulfilled' ? appleCheckResult.value : false;
        const hasGoogleWallet = googleCheckResult.status === 'fulfilled' ? googleCheckResult.value : false;

        // Log detection results
        console.log(`🔍 Wallet detection for customer ${customerId}:`);
        console.log(`   Apple Wallet: ${hasAppleWallet ? 'YES' : 'NO'}${appleCheckResult.status === 'rejected' ? ' (check failed, will try anyway)' : ''}`);
        console.log(`   Google Wallet: ${hasGoogleWallet ? 'YES' : 'NO'}${googleCheckResult.status === 'rejected' ? ' (check failed, will try anyway)' : ''}`);

        // ============================================
        // APPLE WALLET UPDATE (Push Notifications)
        // ============================================
        // Apple Wallet uses APNs push notifications to notify devices that the pass has been updated.
        // Apple's servers will then fetch the updated pass from our server.
        // This is completely separate from Google Wallet updates.
        if (hasAppleWallet) {
            try {
                console.log(`🍎 [APPLE WALLET] Starting Apple Wallet pass update for customer ${customerId}...`);
                if (rewardEarned && rewardType) {
                    // Send special notification for reward earned
                    await notifyRewardEarned(customerId, rewardType as 'coffee' | 'meal');
                    console.log(`🍎 [APPLE WALLET] Reward notification sent for ${rewardType}`);
                } else {
                    // Send regular update notification
                    const notifiedCount = await notifyPassUpdate(customerId);
                    console.log(`🍎 [APPLE WALLET] Update notification sent to ${notifiedCount} device(s)`);
                }
                console.log(`🍎 [APPLE WALLET] Apple Wallet update completed successfully`);
            } catch (appleWalletError: any) {
                // Don't fail the purchase if Apple Wallet notification fails
                // The pass will still update when the user opens Wallet
                console.error('🍎 [APPLE WALLET] Push notification failed (non-critical):', appleWalletError?.message);
                console.error('   Stack:', appleWalletError?.stack);
            }
        } else {
            console.log(`🍎 [APPLE WALLET] Skipping update - customer does not have Apple Wallet pass`);
        }

        // ============================================
        // GOOGLE WALLET UPDATE (Direct API Call)
        // ============================================
        // Google Wallet uses direct API calls to update passes immediately.
        // This is completely separate from Apple Wallet push notifications.
        // Google Wallet updates happen synchronously via their REST API.
        if (hasGoogleWallet) {
            try {
                console.log(`🤖 [GOOGLE WALLET] Starting Google Wallet pass update for customer ${customerId}...`);
                console.log(`🤖 [GOOGLE WALLET] Customer points: ${updatedProfile.points_balance}`);
                console.log(`🤖 [GOOGLE WALLET] Customer name: ${updatedProfile.full_name}`);
                
                const updateResult = await updateGoogleWalletPass(customerId, {
                    id: customerId,
                    full_name: updatedProfile.full_name,
                    points_balance: updatedProfile.points_balance,
                    redeemed_rewards: updatedProfile.redeemed_rewards,
                });
                
                if (updateResult) {
                    console.log(`🤖 [GOOGLE WALLET] Google Wallet pass updated successfully`);
                } else {
                    console.log(`🤖 [GOOGLE WALLET] Google Wallet pass update failed`);
                }
            } catch (googleWalletError: any) {
                // Don't fail the purchase if Google Wallet update fails
                console.error('🤖 [GOOGLE WALLET] Google Wallet update failed (non-critical):', googleWalletError?.message);
                console.error('   Stack:', googleWalletError?.stack);
            }
        } else {
            console.log(`🤖 [GOOGLE WALLET] Skipping update - customer does not have Google Wallet pass`);
        }

        // Build success message
        let message = `Purchase recorded! ${updatedProfile.full_name || 'Customer'} New balance: ${updatedProfile.points_balance} points`;
        if (earnedMeal && earnedCoffee) {
            message += ' 🎉 You earned BOTH a FREE MEAL and FREE COFFEE!';
        } else if (earnedMeal) {
            message += ' 🎉 You earned a FREE MEAL!';
        } else if (earnedCoffee) {
            message += ' 🎉 You earned a FREE COFFEE!';
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
            rewardType: rewardType, // 'meal' or 'coffee' (prioritized for notification)
            earnedMeal: earnedMeal, // true if meal reward earned
            earnedCoffee: earnedCoffee, // true if coffee reward earned
            message: message,
        });


    } catch (error: any) {
        console.error('❌ Purchase processing error:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error?.message},
            { status: 500 }
        );
    }
}