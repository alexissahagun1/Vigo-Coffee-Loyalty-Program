"use client"; // Mark as client component since we need browser APIs (camera, state)

// Import React hooks for managing component state and side effects
import { useEffect, useState, useRef } from "react";
// Import the QR scanner library
import { Html5QrcodeScanner } from "html5-qrcode";
// Import UI components for styling
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Define the structure of customer data returned from the API
interface CustomerData {
    id: string; // Customer's UUID
    name: string; // Customer's full name
    points: number; // Current points balance
    availableRewards: {
        coffees: number[]; // Array of available coffee reward thresholds [10, 20, 30]
        meals: number[]; // Array of available meal reward thresholds [25, 50, 75]
    };
    redeemedRewards: {
        coffees: number[]; // Array of redeemed coffee reward thresholds
        meals: number[]; // Array of redeemed meal reward thresholds
    };
}

// Main component for the employee scan page
export default function ScanPage() {
    // State to store the customer data after scanning
    // null means no customer has been scanned yet
    const [customer, setCustomer] = useState<CustomerData | null>(null);
    
    // State to track if we're currently loading data (fetching from API)
    const [loading, setLoading] = useState(false);
    
    // State to store error messages to display to the user
    const [error, setError] = useState<string | null>(null);
    
    // State to store success messages to display to the user
    const [success, setSuccess] = useState<string | null>(null);
    
    // Reference to the QR scanner instance so we can clean it up later
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    
    // State to track if the scanner is currently active
    const [isScanning, setIsScanning] = useState(true);

    // useEffect runs when the component first mounts (page loads)
    useEffect(() => {
        // Create a new QR scanner instance with responsive dimensions
        // First parameter: ID of the HTML element where scanner will be rendered
        // Second parameter: Configuration object
        const scanner = new Html5QrcodeScanner(
            "qr-reader", // ID of the div where scanner will appear
            {
                // Use qrbox with a function for responsive sizing
                // The function receives viewfinderWidth and viewfinderHeight
                // and returns the qrbox dimensions
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    // Calculate responsive dimensions based on viewport
                    const maxWidth = Math.min(window.innerWidth - 40, 600);
                    const maxHeight = Math.min(window.innerHeight - 200, 600);
                    // Return dimensions, but don't exceed 90% of viewfinder size
                    return {
                        width: Math.min(maxWidth, viewfinderWidth * 0.9),
                        height: Math.min(maxHeight, viewfinderHeight * 0.9)
                    };
                },
                fps: 30, // 30 fps: good balance between speed and battery life
            },
            false // verbose mode (set to false to reduce console logs)
        );

        // Start the scanner and define what happens when a QR code is detected
        scanner.render(
            // onScanSuccess: Called when a QR code is successfully scanned
            (decodedText) => {
                // decodedText contains the data from the QR code (should be the user ID)
                // Trim any whitespace from the scanned text
                const userId = decodedText.trim();
                // Call our function to fetch customer data
                handleScan(userId);
            },
            // onScanFailure: Called when scanning fails (no QR code detected, etc.)
            (errorMessage) => {
                // We ignore scan failures because they happen constantly
                // (when no QR code is in view, camera errors, etc.)
                // This is normal behavior and doesn't need to be shown to the user
            }
        );

        // Store the scanner instance in our ref so we can clean it up later
        scannerRef.current = scanner;

        // Cleanup function: runs when component unmounts (user navigates away)
        return () => {
            // If scanner exists, stop it and clear the HTML element
            if (scannerRef.current) {
                scannerRef.current.clear(); // Stops camera and removes scanner UI
            }
        };
    }, []); // Empty dependency array means this only runs once on mount

    // Function to fetch customer data from the API after scanning QR code
    const handleScan = async (userId: string) => {
        // Set loading state to true to show loading indicator
        setLoading(true);
        // Clear any previous errors
        setError(null);
        // Clear any previous success messages
        setSuccess(null);
        // Stop scanning since we found a QR code
        setIsScanning(false);

        try {
            // Make GET request to our scan API endpoint
            // Pass userId as a query parameter
            const response = await fetch(`/api/scan?userId=${encodeURIComponent(userId)}`);
            
            // Parse the JSON response from the server
            const data = await response.json();

            // Check if the response was successful (status 200-299)
            if (!response.ok) {
                // If not successful, throw an error with the error message from API
                throw new Error(data.error || "Failed to fetch customer data");
            }

            // If successful, store the customer data in state
            // This will trigger a re-render and show the customer information
            setCustomer(data.customer);
        } catch (err: any) {
            // If anything goes wrong, store the error message
            setError(err.message || "Failed to scan customer");
            // Clear customer data since we don't have valid data
            setCustomer(null);
        } finally {
            // Always set loading to false when done (whether success or failure)
            setLoading(false);
        }
    };

    // Function to record a purchase (add 1 point to customer)
    const handlePurchase = async () => {
        // Don't do anything if we don't have customer data
        if (!customer) return;

        // Set loading state to show we're processing
        setLoading(true);
        // Clear previous errors
        setError(null);
        // Clear previous success messages
        setSuccess(null);

        try {
            // Make POST request to purchase API endpoint
            const response = await fetch("/api/purchase", {
                method: "POST", // HTTP method
                headers: { "Content-Type": "application/json" }, // Tell server we're sending JSON
                body: JSON.stringify({ customerId: customer.id }), // Send customer ID in request body
            });

            // Parse the JSON response
            const data = await response.json();

            // Check if request was successful
            if (!response.ok) {
                // If not, throw error with message from API
                throw new Error(data.error || "Failed to record purchase");
            }

            // If successful, show success message
            setSuccess(data.message || "Purchase recorded!");
            
            // Refresh customer data to show updated points
            // This calls handleScan again with the same customer ID
            await handleScan(customer.id);
        } catch (err: any) {
            // If error occurs, store error message to display
            setError(err.message || "Failed to record purchase");
        } finally {
            // Always stop loading when done
            setLoading(false);
        }
    };

    // Function to redeem a reward (mark as redeemed, no point deduction)
    const handleRedeem = async (type: "coffee" | "meal", points: number) => {
        // Don't do anything if we don't have customer data
        if (!customer) return;

        // Set loading state
        setLoading(true);
        // Clear previous errors
        setError(null);
        // Clear previous success messages
        setSuccess(null);

        try {
            // Make POST request to redeem API endpoint
            const response = await fetch("/api/redeem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerId: customer.id, // Customer's UUID
                    type: type, // "coffee" or "meal"
                    points: points, // The threshold value (10, 20, 30 for coffee or 25, 50, 75 for meal)
                }),
            });

            // Parse JSON response
            const data = await response.json();

            // Check if request was successful
            if (!response.ok) {
                throw new Error(data.error || "Failed to redeem reward");
            }

            // Show success message
            setSuccess(data.message || "Reward redeemed!");
            
            // Refresh customer data to show updated available rewards
            await handleScan(customer.id);
        } catch (err: any) {
            // Store error message if something goes wrong
            setError(err.message || "Failed to redeem reward");
        } finally {
            // Always stop loading when done
            setLoading(false);
        }
    };

    // Function to reset the scanner and scan another customer
    const resetScan = () => {
        // Clear customer data
        setCustomer(null);
        // Clear errors
        setError(null);
        // Clear success messages
        setSuccess(null);
        // Set scanning state back to true
        setIsScanning(true);
        
        // Stop and remove the current scanner instance
        if (scannerRef.current) {
            scannerRef.current.clear();
        }
        
        // Create a new scanner instance with responsive dimensions
        const scanner = new Html5QrcodeScanner(
            "qr-reader",
            {
                // Use qrbox with a function for responsive sizing
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    // Calculate responsive dimensions based on viewport
                    const maxWidth = Math.min(window.innerWidth - 40, 600);
                    const maxHeight = Math.min(window.innerHeight - 200, 600);
                    // Return dimensions, but don't exceed 90% of viewfinder size
                    return {
                        width: Math.min(maxWidth, viewfinderWidth * 0.9),
                        height: Math.min(maxHeight, viewfinderHeight * 0.9)
                    };
                },
                fps: 15, // 15 fps: good balance between speed and battery life
            },
            false
        );

        // Start scanning again
        scanner.render(
            (decodedText) => {
                const userId = decodedText.trim();
                handleScan(userId);
            },
            () => {} // Ignore scan failures
        );

        // Store the new scanner instance
        scannerRef.current = scanner;
    };

    // Render the page UI
    return (
        // Container with padding and max width for responsive design
        <div className="container mx-auto p-4 max-w-2xl">
            {/* Page title */}
            <h1 className="text-3xl font-bold mb-6 text-center">Employee Scan</h1>

            {/* Show scanner and loading/error states when no customer is scanned */}
            {!customer && (
                <Card className="p-4 mb-6">
                    {/* Responsive scanner container - adapts to screen size */}
                    <div 
                        id="qr-reader" 
                        className="mb-4 w-full flex justify-center"
                        style={{ 
                            minHeight: '400px', // Minimum height for scanner visibility
                            width: '100%'
                        }}
                    ></div>
                    
                    {/* Show loading message when fetching customer data */}
                    {loading && (
                        <p className="text-center text-lg py-4">Loading customer data...</p>
                    )}
                    
                    {/* Show error message if something went wrong */}
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}
                </Card>
            )}

            {/* Show customer information and actions when a customer is scanned */}
            {customer && (
                <div className="space-y-4">
                    {/* Customer information card */}
                    <Card className="p-6">
                        <CardHeader>
                            <CardTitle>Customer Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {/* Display customer name */}
                                <p><strong>Name:</strong> {customer.name}</p>
                                {/* Display current points balance */}
                                <p><strong>Points Balance:</strong> {customer.points} pts</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Available rewards card */}
                    <Card className="p-6">
                        <CardHeader>
                            <CardTitle>Available Rewards</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Show message if no rewards available */}
                            {customer.availableRewards.coffees.length === 0 && 
                             customer.availableRewards.meals.length === 0 && (
                                <p className="text-gray-500">No rewards available</p>
                            )}

                            {/* List of available reward buttons */}
                            <div className="space-y-2 mb-4">
                                {/* Map through available coffee rewards and create a button for each */}
                                {customer.availableRewards.coffees.map((points) => (
                                    <Button
                                        key={`coffee-${points}`} // Unique key for React
                                        onClick={() => handleRedeem("coffee", points)} // Call handleRedeem when clicked
                                        disabled={loading} // Disable button while loading
                                        className="w-full" // Full width button
                                    >
                                        Redeem Coffee ({points} pts)
                                    </Button>
                                ))}
                                
                                {/* Map through available meal rewards and create a button for each */}
                                {customer.availableRewards.meals.map((points) => (
                                    <Button
                                        key={`meal-${points}`} // Unique key for React
                                        onClick={() => handleRedeem("meal", points)} // Call handleRedeem when clicked
                                        disabled={loading} // Disable button while loading
                                        className="w-full" // Full width button
                                    >
                                        Redeem Meal ({points} pts)
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions card */}
                    <Card className="p-6">
                        <CardHeader>
                            <CardTitle>Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {/* Button to add a purchase (add 1 point) */}
                                <Button
                                    onClick={handlePurchase} // Call handlePurchase when clicked
                                    disabled={loading} // Disable while processing
                                    className="w-full" // Full width
                                >
                                    Add Purchase (+1 point)
                                </Button>
                                
                                {/* Button to scan another customer */}
                                <Button
                                    onClick={resetScan} // Call resetScan when clicked
                                    disabled={loading} // Disable while processing
                                    variant="outline" // Use outline style (less prominent)
                                    className="w-full" // Full width
                                >
                                    Scan Another Customer
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Success message banner (green) */}
                    {success && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                            {success}
                        </div>
                    )}

                    {/* Error message banner (red) */}
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}