// Import Next.js types for handling HTTP requests and responses
import { NextRequest, NextResponse } from "next/server";
// Import the function that creates a Supabase client with service role (bypasses RLS)
import { createServiceRoleClient, createClient } from "@/lib/supabase/server";
// Import the function that sends push notifications to update the Apple Wallet pass
import { notifyPassUpdate } from "@/lib/passkit/push-notifications";
import { updateGoogleWalletPass } from "@/lib/google-wallet/pass-updater";
import { requireEmployeeAuth } from "@/lib/auth/employee-auth";

// Export a POST handler function that Next.js will call when /api/redeem is accessed
// This endpoint marks a reward as redeemed without deducting points
export async function POST(req: NextRequest) {
    // Wrap everything in try-catch to handle any errors gracefully
    try {
        // SECURITY: Require employee authentication
        const authError = await requireEmployeeAuth();
        if (authError) {
            return authError;
        }

        // Parse the JSON body from the request
        // Expected format: { customerId: "uuid", type: "coffee", points: 10 }
        const body = await req.json();
        
        // Extract the customer ID from the request body
        // This is the UUID of the customer whose reward is being redeemed
        const { customerId, type, points } = body;

        // Validate that customerId exists and is a string
        // If not, return a 400 Bad Request error
        if (!customerId || typeof customerId !== "string") {
            return NextResponse.json(
                { error: "Missing or invalid customerId" }, // Error message
                { status: 400 } // HTTP status code: 400 = Bad Request
            );
        }

        // Validate that type exists and is either "coffee" or "meal"
        // If not, return a 400 Bad Request error
        if (!type || (type !== "coffee" && type !== "meal")) {
            return NextResponse.json(
                { error: "Invalid reward type. Must be 'coffee' or 'meal'" }, // Error message
                { status: 400 } // HTTP status code: 400 = Bad Request
            );
        }

        // Validate that points exists and is a number
        // This should be the threshold value (10, 20, 30 for coffee or 25, 50, 75 for meal)
        if (!points || typeof points !== "number") {
            return NextResponse.json(
                { error: "Missing or invalid points threshold" }, // Error message
                { status: 400 } // HTTP status code: 400 = Bad Request
            );
        }

        // Create a Supabase client with service role privileges
        // This bypasses Row Level Security (RLS) so we can update any customer's data
        // Important: This is safe because this API is only for employees, not customers
        const supabase = createServiceRoleClient();

        // Query the profiles table to find the customer by their ID
        // We need to fetch the current profile to get the existing redeemed_rewards
        const result = await supabase
            .from("profiles")
            .select("*")
            .eq("id", customerId)
            .single();

        // Extract the profile data from the result object
        const profile = result.data;
        
        // Extract any error from the result object
        const profileError = result.error;

        // Check if the customer was not found or if there was a database error
        if (profileError || !profile) {
            return NextResponse.json(
                { 
                    error: "Customer not found", // Error message
                    details: profileError?.message // Include the actual error message for debugging
                },
                { status: 404 } // HTTP status code: 404 = Not Found
            );
        }

        // Get the current redeemed rewards object, defaulting to empty arrays if null
        // Structure: { coffees: [10, 20], meals: [25] }
        const redeemedRewards = profile.redeemed_rewards || { coffees: [], meals: [] };
        
        // Select the appropriate array based on reward type
        // If type is "coffee", get the coffees array; if "meal", get the meals array
        // Normalize to numbers (JSONB might return strings)
        const rewardArray = type === "coffee" 
            ? (Array.isArray(redeemedRewards.coffees) ? redeemedRewards.coffees.map(Number).filter((n: number) => !isNaN(n)) : [])
            : (Array.isArray(redeemedRewards.meals) ? redeemedRewards.meals.map(Number).filter((n: number) => !isNaN(n)) : []);

        // Check if this reward threshold has already been redeemed
        // Normalize points to number for comparison (array is already normalized)
        const pointsNumber = Number(points);
        if (isNaN(pointsNumber)) {
            return NextResponse.json(
                { error: "Invalid points threshold value" },
                { status: 400 }
            );
        }
        if (rewardArray.includes(pointsNumber)) {
            return NextResponse.json(
                { error: "Reward already redeemed" },
                { status: 400 }
            );
        }

        // Validate that customer has enough points for this reward threshold
        const currentPoints = Number(profile.points_balance) || 0;
        if (currentPoints < pointsNumber) {
            return NextResponse.json(
                { error: `Customer only has ${currentPoints} points, but reward requires ${pointsNumber} points` },
                { status: 400 }
            );
        }

        // Validate that the points threshold is valid for the reward type
        const POINTS_FOR_COFFEE = 10;
        const POINTS_FOR_MEAL = 25;
        const requiredPoints = type === "coffee" ? POINTS_FOR_COFFEE : POINTS_FOR_MEAL;
        if (pointsNumber < requiredPoints || pointsNumber % requiredPoints !== 0) {
            return NextResponse.json(
                { error: `Invalid points threshold. ${type === "coffee" ? "Coffee" : "Meal"} rewards must be at ${requiredPoints} point intervals (${requiredPoints}, ${requiredPoints * 2}, ${requiredPoints * 3}, etc.)` },
                { status: 400 }
            );
        }

        // Create a new redeemed rewards object with the updated array
        // We spread the existing redeemedRewards object to keep all existing data
        // Then we update the appropriate array (coffees or meals) by adding the new threshold
        // Example: If redeeming coffee at 20 points, add 20 to the coffees array
        // Ensure we normalize all values to numbers
        const updatedRewards = {
            coffees: type === "coffee" 
                ? [...rewardArray, pointsNumber]
                : (Array.isArray(redeemedRewards.coffees) ? redeemedRewards.coffees.map(Number).filter((n: number) => !isNaN(n)) : []),
            meals: type === "meal"
                ? [...rewardArray, pointsNumber]
                : (Array.isArray(redeemedRewards.meals) ? redeemedRewards.meals.map(Number).filter((n: number) => !isNaN(n)) : []),
        };

        // Update the customer's profile in the database
        // We're only updating redeemed_rewards and updated_at (NO point deduction!)
        // Try with updated_at first, fallback without it if schema cache hasn't refreshed
        let updateResult = await supabase
            .from("profiles")
            .update({
                redeemed_rewards: updatedRewards, // New redeemed rewards object with the added threshold
                updated_at: new Date().toISOString(), // Current timestamp in ISO format (needed for PassKit If-Modified-Since)
            })
            .eq("id", customerId)
            .select()
            .single();

        // If update failed due to schema cache issue (updated_at column not found), retry without it
        if (updateResult.error && updateResult.error.message?.includes("updated_at")) {
            updateResult = await supabase
                .from("profiles")
                .update({
                    redeemed_rewards: updatedRewards, // Update without updated_at (database default will handle it)
                })
                .eq("id", customerId)
                .select()
                .single();
        }

        // Extract the updated profile data from the result
        const updatedProfile = updateResult.data;
        
        // Extract any error from the result
        const updatedError = updateResult.error;

        // Check if the update failed
        if (updatedError || !updatedProfile) {
            return NextResponse.json(
                { 
                    error: "Failed to redeem reward", // Error message
                    details: updatedError?.message // Include the actual error message for debugging
                },
                { status: 500 } // HTTP status code: 500 = Internal Server Error
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
        const transactionType = type === 'coffee' ? 'redemption_coffee' : 'redemption_meal';
        try {
            const { error: transactionError } = await supabase
                .from('transactions')
                .insert({
                    customer_id: customerId,
                    employee_id: employeeId,
                    type: transactionType,
                    points_change: 0, // Redemptions don't change points
                    points_balance_after: updatedProfile.points_balance,
                    reward_points_threshold: points,
                });
            
            if (transactionError) {
                // Don't fail the redemption if transaction logging fails
                console.error('⚠️  Transaction logging failed (non-critical):', transactionError.message, transactionError);
            }
        } catch (transactionError: any) {
            // Don't fail the redemption if transaction logging fails
            console.error('⚠️  Transaction logging failed (non-critical):', transactionError?.message);
        }

        // Send a push notification to update the Apple Wallet pass
        // This tells Apple's servers that the pass has changed, and they'll fetch the updated version
        // We wrap this in try-catch because notification failure shouldn't fail the redemption
        try {
            // Call the notification function with the customer's ID
            // This will find all registered devices for this customer and send APNs notifications
            await notifyPassUpdate(customerId);
        } catch (notificationError: any) {
            // If notification fails, log it but don't fail the redemption
            // The pass will still update eventually when the customer opens Wallet
            console.error("⚠️  Push notification failed (non-critical):", notificationError?.message);
        }

        // Update Google Wallet pass (if user has one)
        try {
            await updateGoogleWalletPass(customerId, {
                id: customerId,
                full_name: updatedProfile.full_name,
                points_balance: updatedProfile.points_balance,
                redeemed_rewards: updatedProfile.redeemed_rewards,
            });
        } catch (googleWalletError: any) {
            // Don't fail the redemption if Google Wallet update fails
            console.error("⚠️  Google Wallet update failed (non-critical):", googleWalletError?.message);
        }

        // Return a successful response with the updated customer information
        return NextResponse.json({
            success: true, // Indicates the request succeeded
            message: `Reward redeemed successfully! ${type} at ${points} points`, // Success message
            customer: {
                id: updatedProfile.id, // Customer's UUID
                name: updatedProfile.full_name || "Customer", // Customer's name
                points: updatedProfile.points_balance, // Current points (unchanged - no deduction!)
                redeemedRewards: updatedProfile.redeemed_rewards, // Updated redeemed rewards object
            },
        });
    } catch (error: any) {
        // If any unexpected error occurs (network error, database error, JSON parse error, etc.)
        // Log it to the server console for debugging
        console.error("❌ Redeem API error:", error);
        
        // Return a 500 Internal Server Error response
        return NextResponse.json(
            { 
                error: "Internal server error", // Generic error message for client
                details: error?.message // Actual error details for debugging
            },
            { status: 500 } // HTTP status code: 500 = Internal Server Error
        );
    }
}