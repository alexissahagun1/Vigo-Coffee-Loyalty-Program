"use client";

import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CustomerData {
    id: string;
    name: string;
    points: number;
    availableRewards: {
        coffees: number[];
        meals: number[];
    };
    redeemedRewards: {
        coffees: number[];
        meals: number[];
    };
}

export default function ScanPage() {
    const [customer, setCustomer] = useState<CustomerData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [cameraPermission, setCameraPermission] = useState<"requesting" | "granted" | "denied" | null>(null);
    
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const scannerContainerRef = useRef<HTMLDivElement>(null);

    // Function to get back camera ID
    const getBackCameraId = async (): Promise<string | null> => {
        try {
            const devices = await Html5Qrcode.getCameras();
            
            // Prefer back camera (environment-facing)
            const backCamera = devices.find(device => 
                device.label.toLowerCase().includes('back') ||
                device.label.toLowerCase().includes('rear') ||
                device.label.toLowerCase().includes('environment')
            );
            
            if (backCamera) {
                return backCamera.id;
            }
            
            // If no back camera found, use the last device (usually back camera on mobile)
            if (devices.length > 0) {
                return devices[devices.length - 1].id;
            }
            
            return null;
        } catch (err) {
            console.error("Error getting cameras:", err);
            return null;
        }
    };

    // Start scanning with automatic camera permission request
    const startScanning = async () => {
        // If already scanning, don't start again
        if (isScanning) {
            return;
        }

        setCameraPermission("requesting");
        setError(null);

        try {
            const cameraId = await getBackCameraId();
            
            if (!cameraId) {
                throw new Error("No camera found");
            }

            const html5QrCode = new Html5Qrcode("qr-reader");
            html5QrCodeRef.current = html5QrCode;

            // Start scanning with back camera
            await html5QrCode.start(
                cameraId,
                {
                    fps: 10,
                    qrbox: { width: 300, height: 300 },
                    aspectRatio: 1.0,
                },
                (decodedText) => {
                    // QR code scanned successfully
                    handleScan(decodedText.trim());
                },
                (errorMessage) => {
                    // Ignore scan errors (normal when no QR code in view)
                }
            );

            setCameraPermission("granted");
            setIsScanning(true);
        } catch (err: any) {
            console.error("Error starting scanner:", err);
            setCameraPermission("denied");
            setError("Failed to access camera. Please allow camera permissions and try again.");
        }
    };

    // Stop scanning
    const stopScanning = async () => {
        if (html5QrCodeRef.current) {
            try {
                await html5QrCodeRef.current.stop().catch(() => {
                    // Ignore errors if already stopped
                });
                await html5QrCodeRef.current.clear();
            } catch (err) {
                console.error("Error stopping scanner:", err);
            }
            html5QrCodeRef.current = null;
        }
        setIsScanning(false);
    };

    // Auto-start scanning on mount
    useEffect(() => {
        startScanning();

        return () => {
            stopScanning();
        };
    }, []);

    const handleScan = async (userId: string) => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        await stopScanning();

        try {
            const response = await fetch(`/api/scan?userId=${encodeURIComponent(userId)}`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch customer data");
            }

            setCustomer(data.customer);
        } catch (err: any) {
            setError(err.message || "Failed to scan customer");
            setCustomer(null);
            // Restart scanning on error
            setTimeout(() => startScanning(), 2000);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async () => {
        if (!customer) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customerId: customer.id }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to record purchase");
            }

            setSuccess(data.message || "Purchase recorded!");
            await handleScan(customer.id);
        } catch (err: any) {
            setError(err.message || "Failed to record purchase");
        } finally {
            setLoading(false);
        }
    };

    const handleRedeem = async (type: "coffee" | "meal", points: number) => {
        if (!customer) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch("/api/redeem", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerId: customer.id,
                    type: type,
                    points: points,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to redeem reward");
            }

            setSuccess(data.message || "Reward redeemed!");
            await handleScan(customer.id);
        } catch (err: any) {
            setError(err.message || "Failed to redeem reward");
        } finally {
            setLoading(false);
        }
    };

    const resetScan = async () => {
        setCustomer(null);
        setError(null);
        setSuccess(null);
        await stopScanning();
        
        // Restart scanning after a brief delay
        setTimeout(() => startScanning(), 500);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
            <div className="container mx-auto p-4 max-w-2xl">
                <h1 className="text-4xl font-bold mb-6 text-center text-white">Employee Scan</h1>

                {!customer && (
                    <Card className="bg-gray-800 border-gray-700">
                        <CardContent className="p-4">
                            {/* Scanner container */}
                            <div 
                                ref={scannerContainerRef}
                                id="qr-reader" 
                                className="mb-4 w-full rounded-lg overflow-hidden bg-black"
                                style={{ 
                                    minHeight: '400px',
                                    width: '100%'
                                }}
                            ></div>
                            
                            {/* Camera permission status */}
                            {cameraPermission === "requesting" && (
                                <div className="text-center py-4">
                                    <p className="text-lg">Requesting camera permission...</p>
                                </div>
                            )}
                            
                            {cameraPermission === "denied" && (
                                <div className="bg-yellow-900 border border-yellow-700 text-yellow-200 px-4 py-3 rounded mb-4">
                                    <p className="font-semibold">Camera permission denied</p>
                                    <p className="text-sm mt-1">Please allow camera access in your browser settings and refresh the page.</p>
                                    <Button 
                                        onClick={startScanning} 
                                        className="mt-2"
                                        variant="outline"
                                    >
                                        Try Again
                                    </Button>
                                </div>
                            )}
                            
                            {loading && (
                                <div className="text-center py-4">
                                    <p className="text-lg">Loading customer data...</p>
                                </div>
                            )}
                            
                            {error && (
                                <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
                                    {error}
                                </div>
                            )}

                            {!isScanning && cameraPermission === "granted" && (
                                <Button 
                                    onClick={startScanning} 
                                    className="w-full"
                                >
                                    Start Scanning
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                )}

                {customer && (
                    <div className="space-y-4">
                        <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white">Customer Information</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-white">
                                    <p><strong>Name:</strong> {customer.name}</p>
                                    <p><strong>Points Balance:</strong> {customer.points} pts</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white">Available Rewards</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {customer.availableRewards.coffees.length === 0 && 
                                 customer.availableRewards.meals.length === 0 && (
                                    <p className="text-gray-400">No rewards available</p>
                                )}

                                <div className="space-y-2 mb-4">
                                    {customer.availableRewards.coffees.map((points) => (
                                        <Button
                                            key={`coffee-${points}`}
                                            onClick={() => handleRedeem("coffee", points)}
                                            disabled={loading}
                                            className="w-full bg-blue-600 hover:bg-blue-700"
                                        >
                                            Redeem Coffee ({points} pts)
                                        </Button>
                                    ))}
                                    
                                    {customer.availableRewards.meals.map((points) => (
                                        <Button
                                            key={`meal-${points}`}
                                            onClick={() => handleRedeem("meal", points)}
                                            disabled={loading}
                                            className="w-full bg-green-600 hover:bg-green-700"
                                        >
                                            Redeem Meal ({points} pts)
                                        </Button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gray-800 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white">Actions</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    <Button
                                        onClick={handlePurchase}
                                        disabled={loading}
                                        className="w-full bg-purple-600 hover:bg-purple-700"
                                    >
                                        Add Purchase (+1 point)
                                    </Button>
                                    
                                    <Button
                                        onClick={resetScan}
                                        disabled={loading}
                                        variant="outline"
                                        className="w-full border-gray-600 text-white hover:bg-gray-700"
                                    >
                                        Scan Another Customer
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {success && (
                            <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded">
                                {success}
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded">
                                {error}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
