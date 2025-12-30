"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import Image from "next/image";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";


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
    const [isScanning, setIsScanning] = useState(false);
    const [cameraPermission, setCameraPermission] = useState<"requesting" | "granted" | "denied" | null>(null);
    const [isScanningActive, setIsScanningActive] = useState(false);
    const [isEmployee, setIsEmployee] = useState<boolean | null>(null); // null = checking, true = is employee, false = not employee
    
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const scannerContainerRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isScanningRef = useRef(false); // Guard against race conditions
    const router = useRouter();
    const { toast } = useToast();

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

    // Use ref to store handleScan so it can be called from startScanning callback
    const handleScanRef = useRef<((userId: string) => Promise<void>) | null>(null);

    // Stop scanning
    const stopScanning = useCallback(async () => {
        isScanningRef.current = false;
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
        setIsScanningActive(false);
    }, []);

    // Start scanning with automatic camera permission request
    const startScanning = useCallback(async () => {
        // If already scanning, don't start again (check both state and ref)
        if (isScanningRef.current || html5QrCodeRef.current) {
            return;
        }

        isScanningRef.current = true;
        setCameraPermission("requesting");
        setError(null);

        try {
            const cameraId = await getBackCameraId();
            
            if (!cameraId) {
                throw new Error("No camera found");
            }

            // Create new scanner instance (we already checked that none exists at line 131)
            const html5QrCode = new Html5Qrcode("qr-reader");
            html5QrCodeRef.current = html5QrCode;

            // Calculate optimal QR box size - use 85% of viewport for maximum scanning area
            const getOptimalQrBoxSize = (viewfinderWidth: number, viewfinderHeight: number) => {
                // Use 85% of the smaller dimension for optimal balance between scanning area and performance
                const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.85;
                // Ensure minimum size for small screens and maximum for large screens
                const minSize = 250;
                const maxSize = 600;
                return Math.max(minSize, Math.min(maxSize, size));
            };

            // Start scanning with back camera - optimized for mobile performance
            await html5QrCode.start(
                cameraId,
                {
                    fps: 48, // High FPS for fast scanning (48 is optimal for mobile - balances speed and battery)
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const size = getOptimalQrBoxSize(viewfinderWidth, viewfinderHeight);
                        return {
                            width: size,
                            height: size
                        };
                    },
                    aspectRatio: 1.0, // Square aspect ratio for QR codes
                    disableFlip: false, // Allow QR codes in any orientation for faster scanning
                    // Video constraints optimized for mobile devices
                    videoConstraints: {
                        facingMode: "environment", // Force back camera
                        width: { ideal: 1920, min: 1280 }, // Higher resolution for better QR code detection
                        height: { ideal: 1080, min: 720 },
                    }
                },
            (decodedText) => {
                    // QR code scanned successfully - stop immediately to prevent duplicate scans
                    if (handleScanRef.current) {
                        handleScanRef.current(decodedText.trim());
                    }
                },
            (errorMessage) => {
                    // Ignore scan errors (normal when no QR code in view)
                    // Only log if it's an actual error, not just "not found"
                    if (!errorMessage.includes("NotFoundException")) {
                        // Silently ignore - these are expected during scanning
                    }
                }
            );

            setCameraPermission("granted");
            setIsScanning(true);
            setIsScanningActive(true);
        } catch (err: any) {
            console.error("Error starting scanner:", err);
            setCameraPermission("denied");
            isScanningRef.current = false;
            const errorMessage = "Failed to access camera. Please allow camera permissions and try again.";
            setError(errorMessage);
            toast({
                title: "Camera Error",
                description: errorMessage,
                variant: "destructive",
            });
        }
    }, [toast]);

    useEffect(() => {
        const checkEmployee = async () => {
            try {
                const supabase = createClient();

                // Get current user
                const userResult = await supabase.auth.getUser();
                const user  = userResult.data.user;

                if (!user) {
                    // No user, redirect to login
                    router.push("/login");
                    return;
                }

                // Check if user is an employee using API endpoint (bypasses RLS)
                // RLS blocks direct client queries to employees table
                const checkResponse = await fetch('/api/auth/employee/check');
                const checkData = await checkResponse.json();

                if (!checkResponse.ok || !checkData.success || !checkData.isEmployee) {
                    router.push("/login");
                    return;
                }

                // If everything is good, set isEmployee to true
                setIsEmployee(true);
            } catch (err) {
                // If check fails, redirect to login
                console.error("Error checking employee status:", err);
                router.push("/login");
            }
        };

        checkEmployee();
    
    }, [router]); // Include router in dependencies

    // Auto-start scanning only after employee check passes
    // This useEffect must be called before any early returns to follow Rules of Hooks
    useEffect(() => {
        // Don't start scanning until we know user is an employee
        if (isEmployee !== true) {
            return;
        }
        
        let isMounted = true;
        
        const start = async () => {
            if (isMounted) {
                await startScanning();
            }
        };
        
        start();
        
        return () => {
            isMounted = false;
            stopScanning();
            // Clean up any pending timeouts
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [isEmployee, startScanning, stopScanning]); // Run when isEmployee changes

    // Dont render anything until we've checked employee status

    if (isEmployee === null) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/10 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-lg text-foreground">Checking access...</p>
                </div>
            </div>
        );
    }
    
    // If not an employee, don't render (redirect is happening)
    if (isEmployee === false) {
        return null;
    }

    const handleScan = async (userId: string) => {
        // Validate userId format (should be a UUID)
        if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
            const errorMessage = "Invalid QR code. Please scan a valid customer QR code.";
            setError(errorMessage);
            toast({
                title: "Scan Error",
                description: errorMessage,
                variant: "destructive",
            });
            // Restart scanning after error
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                startScanning();
                timeoutRef.current = null;
            }, 2000);
            return;
        }

        setLoading(true);
        setError(null);
        await stopScanning();

        try {
            // Add cache-busting timestamp and no-cache headers to ensure fresh data
            const timestamp = new Date().getTime();
            const response = await fetch(`/api/scan?userId=${encodeURIComponent(userId.trim())}&_t=${timestamp}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                },
            });
            
            // Check if response is ok before parsing JSON
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                throw new Error("Invalid response from server. Please try again.");
            }

            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch customer data");
            }

            setCustomer(data.customer);
        } catch (err: any) {
            const errorMessage = err.message || "Failed to scan customer";
            setError(errorMessage);
            setCustomer(null);
            toast({
                title: "Scan Error",
                description: errorMessage,
                variant: "destructive",
            });
            // Restart scanning on error - store timeout ID for cleanup
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                startScanning();
                timeoutRef.current = null;
            }, 2000);
        } finally {
            setLoading(false);
        }
    };

    // Store handleScan in ref so it can be accessed from startScanning callback
    handleScanRef.current = handleScan;

    const handlePurchase = async () => {
        if (!customer) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/purchase", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customerId: customer.id }),
            });

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                throw new Error("Invalid response from server. Please try again.");
            }

            if (!response.ok) {
                throw new Error(data.error || "Failed to record purchase");
            }

            const successMessage = data.message || "Purchase recorded successfully!";
            toast({
                title: "Purchase Added",
                description: successMessage,
                className: "bg-success text-success-foreground border-success",
            });
            await handleScan(customer.id);
        } catch (err: any) {
            const errorMessage = err.message || "Failed to record purchase";
            setError(errorMessage);
            toast({
                title: "Purchase Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRedeem = async (type: "coffee" | "meal", points: number) => {
        if (!customer) return;

        setLoading(true);
        setError(null);

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

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                throw new Error("Invalid response from server. Please try again.");
            }

            if (!response.ok) {
                throw new Error(data.error || "Failed to redeem reward");
            }

            const successMessage = data.message || "Reward redeemed successfully!";
            toast({
                title: "Reward Redeemed",
                description: successMessage,
                className: "bg-success text-success-foreground border-success",
            });
            await handleScan(customer.id);
        } catch (err: any) {
            const errorMessage = err.message || "Failed to redeem reward";
            setError(errorMessage);
            toast({
                title: "Redemption Error",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const resetScan = async () => {
        setCustomer(null);
        setError(null);
        await stopScanning();
        
        // Clear any existing timeout before setting a new one
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        
        // Restart scanning after a brief delay to allow cleanup
        // Store timeout in ref so it can be cleaned up on unmount
        timeoutRef.current = setTimeout(() => {
            startScanning();
            timeoutRef.current = null;
        }, 300);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/10">
        <div className="container mx-auto p-4 max-w-2xl">
                <div className="flex flex-col items-center mb-6">
                    <Image
                        src="/assets/vigo-logo.jpg"
                        alt="Vigo Logo"
                        width={120}
                        height={120}
                        className="mb-4 rounded-lg"
                        priority
                        onError={(e) => {
                            // Fallback if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                        }}
                    />
                    <h1 className="text-4xl font-bold text-center text-foreground font-display">Employee Scan</h1>
                </div>

            {!customer && (
                    <Card className="bg-card border-border shadow-lg">
                        <CardContent className="p-4">
                            {/* Scanner container */}
                            <div className="relative">
                                <div 
                                    ref={scannerContainerRef}
                                    id="qr-reader" 
                                    className="mb-4 w-full rounded-lg overflow-hidden bg-black"
                                    style={{ 
                                        minHeight: '400px',
                                        width: '100%'
                                    }}
                                ></div>
                                
                                {/* Scanning indicator - shows when actively scanning */}
                                {isScanning && isScanningActive && (
                                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold shadow-lg z-10 flex items-center gap-2">
                                        <div className="w-2 h-2 bg-primary-foreground rounded-full animate-pulse"></div>
                                        Scanning...
                                    </div>
                                )}
                                
                            </div>
                            
                            {/* Camera permission status */}
                            {cameraPermission === "requesting" && (
                                <div className="text-center py-4">
                                    <p className="text-lg">Requesting camera permission...</p>
                                </div>
                            )}
                            
                            {cameraPermission === "denied" && (
                                <div className="bg-warning/10 border border-warning text-warning-foreground px-4 py-3 rounded mb-4">
                                    <p className="font-semibold">Camera permission denied</p>
                                    <p className="text-sm mt-1">Please allow camera access in your browser settings and refresh the page.</p>
                                    <Button 
                                        onClick={startScanning} 
                                        className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground"
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
                                <div className="bg-destructive/10 border border-destructive text-destructive-foreground px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                            {!isScanning && cameraPermission === "granted" && (
                                <Button 
                                    onClick={startScanning} 
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                                >
                                    Start Scanning
                                </Button>
                            )}
                        </CardContent>
                </Card>
            )}

            {customer && (
                <div className="space-y-4">
                        {/* Scan New Customer Button - Prominent at top */}
                        <Button
                            onClick={resetScan}
                            disabled={loading}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6 font-semibold"
                            size="lg"
                        >
                            <QrCode className="mr-2 h-5 w-5" />
                            Scan New Customer
                        </Button>

                        <Card className="bg-card border-border shadow-lg">
                        <CardHeader>
                                <CardTitle className="text-foreground">Customer Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                                <div className="space-y-2 text-foreground">
                                <p><strong>Name:</strong> {customer.name}</p>
                                <p><strong>Points Balance:</strong> {customer.points} pts</p>
                            </div>
                        </CardContent>
                    </Card>

                        <Card className="bg-card border-border shadow-lg">
                        <CardHeader>
                                <CardTitle className="text-foreground">Available Rewards</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {customer.availableRewards.coffees.length === 0 && 
                             customer.availableRewards.meals.length === 0 && (
                                    <p className="text-muted-foreground">No rewards available</p>
                            )}

                            <div className="space-y-2 mb-4">
                                {customer.availableRewards.coffees.map((points) => (
                                    <Button
                                            key={`coffee-${points}`}
                                            onClick={() => handleRedeem("coffee", points)}
                                            disabled={loading}
                                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                                    >
                                        Redeem Coffee ({points} pts)
                                    </Button>
                                ))}
                                
                                {customer.availableRewards.meals.map((points) => (
                                    <Button
                                            key={`meal-${points}`}
                                            onClick={() => handleRedeem("meal", points)}
                                            disabled={loading}
                                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                                    >
                                        Redeem Meal ({points} pts)
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                        <Card className="bg-card border-border shadow-lg">
                        <CardHeader>
                                <CardTitle className="text-foreground">Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Button
                                        onClick={handlePurchase}
                                        disabled={loading}
                                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                                >
                                    Add Purchase (+1 point)
                                </Button>
                                
                                <Button
                                        onClick={resetScan}
                                        disabled={loading}
                                        variant="outline"
                                        className="w-full border-border text-foreground hover:bg-accent"
                                >
                                    Scan Another Customer
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
            </div>
        </div>
    );
}
