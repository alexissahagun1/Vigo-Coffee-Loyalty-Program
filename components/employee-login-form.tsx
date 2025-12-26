"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Image from "next/image";

/**
 * Employee Login Form Component
 * Allows employees to log in using username and password.
 */
export function EmployeeLoginForm() {
    // State for form inputs
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    
    // State for error messages
    const [error, setError] = useState<string | null>(null);
    
    // State for loading indicator
    const [isLoading, setIsLoading] = useState(false);
    
    // Router for navigation after successful login
    const router = useRouter();

    /**
     * Handles form submission when employee clicks login button
     */
    const handleLogin = async (e: React.FormEvent) => {
        // Prevent page refresh on form submit
        e.preventDefault();
        e.stopPropagation();
        
        console.log("Login form submitted", { username, passwordLength: password.length });
        
        // Validate inputs
        if (!username.trim() || !password.trim()) {
            setError("Please enter both username and password");
            return;
        }
        
        // Create Supabase client for database queries
        const supabase = createClient();
        
        // Show loading state and clear previous errors
        setIsLoading(true);
        setError(null);
        
        console.log("Starting login process...");

        try {
            console.log("Step 1: Looking up employee by username...");
            // Step 1: Look up employee by username using API endpoint (bypasses RLS)
            // RLS blocks direct client queries to employees table, so we use an API endpoint
            const lookupResponse = await fetch('/api/auth/employee/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim() }),
            });

            console.log("Lookup response status:", lookupResponse.status);

            if (!lookupResponse.ok) {
                const errorData = await lookupResponse.json().catch(() => ({ error: 'Network error' }));
                console.error("Lookup failed:", errorData);
                throw new Error(errorData.error || "Invalid username or password");
            }

            const lookupData = await lookupResponse.json();
            console.log("Lookup data:", lookupData);

            if (!lookupData.success) {
                throw new Error(lookupData.error || "Invalid username or password");
            }

            const employeeEmail = lookupData.email;
            console.log("Step 2: Authenticating with email:", employeeEmail);

            // Step 2: Authenticate with Supabase using email + password
            // Now that we have the email, we can use Supabase's built-in auth
            const { error: authError, data: authData } = await supabase.auth.signInWithPassword({
                email: employeeEmail,
                password: password.trim(),
            });

            console.log("Auth result:", { error: authError?.message, hasData: !!authData });

            // If password is wrong, show error
            if (authError) {
                console.error('Auth error:', authError);
                // Provide more specific error messages
                if (authError.message?.includes('Invalid login credentials') || authError.message?.includes('Email not confirmed')) {
                    throw new Error("Invalid username or password");
                }
                throw new Error(authError.message || "Invalid username or password");
            }

            console.log("Step 3: Getting authenticated user...");
            // Step 4: Get the authenticated user
            // Verify that authentication actually worked
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                throw new Error("Authentication failed, failed to get user");
            }

            console.log("Step 4: Checking employee status...");
            // Step 5: Double-check employee record exists and is active using API endpoint
            // Security measure: verify the authenticated user is actually an employee
            // Using API endpoint to bypass RLS
            const employeeCheckResponse = await fetch('/api/auth/employee/check');
            const employeeCheckData = await employeeCheckResponse.json();

            console.log("Employee check:", employeeCheckData);

            if (!employeeCheckResponse.ok || !employeeCheckData.success || !employeeCheckData.isEmployee) {
                // Sign out the user if they're not an employee
                await supabase.auth.signOut();
                throw new Error("Access denied, employee not found or not active");
            }
            
            console.log("Step 5: Login successful! Redirecting to /scan...");
            // Step 6: Success! Redirect to scan page
            // Wait a moment for session cookies to be fully established
            await new Promise(resolve => setTimeout(resolve, 500));
            // Use router.push with refresh to ensure session is established
            router.push("/scan");
            router.refresh();
            
        } catch (error: unknown) {
            // Display error message to user
            const errorMessage = error instanceof Error ? error.message : "An error occurred";
            console.error("Login error:", error);
            setError(errorMessage);
        } finally {
            // Always stop loading indicator, whether success or failure
            setIsLoading(false);
        }
    }

    // Render the login form UI
    return (
        <div className="flex flex-col gap-6">
            {/* Logo at the top */}
            <div className="flex justify-center mb-4">
                <Image
                    src="/logo3.png"
                    alt="Vigo Coffee Logo"
                    width={200}
                    height={100}
                    priority
                    className="object-contain"
                />
            </div>
            
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <Image
                            src="/icon.png"
                            alt="Icon"
                            width={32}
                            height={32}
                            className="object-contain"
                        />
                        <CardTitle className="text-2xl">Employee Login</CardTitle>
                    </div>
                    <CardDescription>
                        Enter your username and password to access the employee portal
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin}>
                        <div className="flex flex-col gap-6">
                            {/* Username input field */}
                            <div className="grid gap-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    type="text"
                                    placeholder="Enter your username"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    autoComplete="username"
                                />
                            </div>

                            {/* Password input field */}
                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label htmlFor="password">Password</Label>
                                    <Link
                                        href="/auth/employee/forgot-password"
                                        className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                />
                            </div>

                            {/* Error message display */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Submit button */}
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? "Logging in..." : "Login"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}