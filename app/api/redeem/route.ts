// Import Next.js types for handling HTTP requests and responses
import { NextRequest, NextResponse } from "next/server";
// Import the function that creates a Supabase client with service role (bypasses RLS)
import { createServiceRoleClient } from "@/lib/supabase/server";
// Import the function that sends push notifications to update the Apple Wallet pass
import { notifyPassUpdate } from "@/lib/passkit/push-notifications";

// Export a POST handler function that Next.js will call when /api/redeem is accessed
// This endpoint marks a reward as redeemed without deducting points
export async function POST(req: NextRequest) {
    // Wrap everything in try-catch to handle any errors gracefully
    try {
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
        const rewardArray = type === "coffee" ? redeemedRewards.coffees || [] : redeemedRewards.meals || [];

        // Check if this reward threshold has already been redeemed
        // If the points value is already in the array, the customer already redeemed it
        if (rewardArray.includes(points)) {
            return NextResponse.json(
                { error: "Reward already redeemed" }, // Error message
                { status: 400 } // HTTP status code: 400 = Bad Request
            );
        }

        // Create a new redeemed rewards object with the updated array
        // We spread the existing redeemedRewards object to keep all existing data
        // Then we update the appropriate array (coffees or meals) by adding the new threshold
        // Example: If redeeming coffee at 20 points, add 20 to the coffees array
        const updatedRewards = {
            ...redeemedRewards, // Keep existing redeemed rewards
            [type === "coffee" ? "coffees" : "meals"]: [...rewardArray, points], // Add new threshold to array
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