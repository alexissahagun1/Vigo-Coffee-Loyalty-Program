// Import Next.js types for handling HTTP requests and responses
import { NextRequest, NextResponse } from "next/server";
// Import the function that creates a Supabase client with service role (bypasses RLS)
import { createServiceRoleClient } from "@/lib/supabase/server";

// Define constants for reward thresholds
// These match the values used in the purchase API
const POINTS_FOR_COFFEE = 10; // Customer earns a coffee reward every 10 points
const POINTS_FOR_MEAL = 25; // Customer earns a meal reward every 25 points

// Export a GET handler function that Next.js will call when /api/scan is accessed
// This endpoint fetches customer information and calculates available rewards
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // Wrap everything in try-catch to handle any errors gracefully
    try {
        // Extract the URL search parameters from the request
        // Example: /api/scan?userId=123-456-789
        const { searchParams } = new URL(req.url);
        
        // Get the userId parameter from the query string
        // This is the customer's UUID that was scanned from the QR code
        const userId = searchParams.get("userId");

        // Validate that we received a userId and it's a string
        // If not, return a 400 Bad Request error
        if (!userId || typeof userId !== "string") {
            return NextResponse.json(
                { error: "Missing or invalid userId" }, // Error message for the client
                { status: 400 } // HTTP status code: 400 = Bad Request
            );
        }

        // Create a Supabase client with service role privileges
        // This bypasses Row Level Security (RLS) so we can read any customer's data
        // Important: This is safe because this API is only for employees, not customers
        const supabase = createServiceRoleClient();

        // Query the profiles table to find the customer by their ID
        // .from('profiles') - Select from the profiles table
        // .select('*') - Get all columns (id, full_name, points_balance, redeemed_rewards, etc.)
        // .eq('id', userId) - Filter where id equals the userId from the QR code
        // .single() - Expect exactly one result (throws error if 0 or multiple results)
        const result = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

        // Extract the profile data from the result object
        // This will be null if the customer wasn't found
        const profile = result.data;
        
        // Extract any error from the result object
        // This will be null if the query succeeded
        const profileError = result.error;

        // Check if the customer was not found or if there was a database error
        // If either condition is true, return a 404 Not Found error
        if (profileError || !profile) {
            return NextResponse.json(
                { 
                    error: "Customer not found", // Error message
                    details: profileError?.message // Include the actual error message for debugging
                },
                { status: 404 } // HTTP status code: 404 = Not Found
            );
        }

        // Get the customer's current points balance, defaulting to 0 if null
        // This handles cases where the profile exists but points_balance is null
        const points = profile.points_balance || 0;
        
        // Get the customer's redeemed rewards object, defaulting to empty arrays if null
        // Structure: { coffees: [10, 20], meals: [25] }
        // This handles cases where redeemed_rewards column doesn't exist or is null
        const redeemedRewards = profile.redeemed_rewards || { coffees: [], meals: [] };
        
        // Extract the array of redeemed coffee reward thresholds
        // Example: [10, 20] means they redeemed coffee at 10 and 20 points
        const redeemedCoffees = redeemedRewards.coffees || [];
        
        // Extract the array of redeemed meal reward thresholds
        // Example: [25] means they redeemed meal at 25 points
        const redeemedMeals = redeemedRewards.meals || [];

        // Initialize arrays to store available (unredeemed) rewards
        const availableCoffees: number[] = []; // Will contain: [10, 20, 30] etc.
        const availableMeals: number[] = []; // Will contain: [25, 50, 75] etc.

        // Loop through all possible coffee reward thresholds up to the customer's current points
        // Start at 10 (POINTS_FOR_COFFEE), increment by 10 each time
        // Example: If customer has 23 points, check 10 and 20
        for (let threshold = POINTS_FOR_COFFEE; threshold <= points; threshold += POINTS_FOR_COFFEE) {
            // Check if this threshold has NOT been redeemed yet
            // If it's not in the redeemedCoffees array, it's available
            if (!redeemedCoffees.includes(threshold)) {
                // Add this threshold to the available coffees array
                // Example: If threshold is 20 and not redeemed, add 20 to availableCoffees
                availableCoffees.push(threshold);
            }
        }

        // Loop through all possible meal reward thresholds up to the customer's current points
        // Start at 25 (POINTS_FOR_MEAL), increment by 25 each time
        // Example: If customer has 50 points, check 25 and 50
        for (let threshold = POINTS_FOR_MEAL; threshold <= points; threshold += POINTS_FOR_MEAL) {
            // Check if this threshold has NOT been redeemed yet
            // If it's not in the redeemedMeals array, it's available
            if (!redeemedMeals.includes(threshold)) {
                // Add this threshold to the available meals array
                // Example: If threshold is 25 and not redeemed, add 25 to availableMeals
                availableMeals.push(threshold);
            }
        }

        // Return a successful response with all the customer information
        // This JSON will be sent back to the frontend (the scan page)
        return NextResponse.json({
            success: true, // Indicates the request succeeded
            customer: {
                id: profile.id, // Customer's UUID
                name: profile.full_name || "Customer", // Customer's name, or "Customer" if null
                points: points, // Current points balance
                availableRewards: {
                    coffees: availableCoffees, // Array of available coffee reward thresholds
                    meals: availableMeals, // Array of available meal reward thresholds
                },
                redeemedRewards: {
                    coffees: redeemedCoffees, // Array of redeemed coffee reward thresholds
                    meals: redeemedMeals, // Array of redeemed meal reward thresholds
                },
            },
        });
    } catch (error: any) {
        // If any unexpected error occurs (network error, database error, etc.)
        // Log it to the server console for debugging
        console.error("❌ Scan API error:", error);
        
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