"use client";

import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if we have the necessary hash/token from Supabase
    const hash = window.location.hash;
    const urlParams = new URLSearchParams(window.location.search);
    if (!hash && !urlParams.get('code')) {
      // Don't show error immediately - Supabase might handle it via hash
      // The hash is typically in the URL fragment, not query params
    }
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    try {
      // Update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        throw updateError;
      }

      // Verify user is an employee
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: employee } = await supabase
          .from('employees')
          .select('id, is_active')
          .eq('id', user.id)
          .single();

        if (employee && employee.is_active) {
          // Success! Redirect to scan page
          router.push("/scan");
          return;
        }
      }

      // If not an employee, redirect to login
      router.push("/login?success=Password updated successfully");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md">
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
              <CardTitle className="text-2xl">Set New Password</CardTitle>
            </div>
            <CardDescription>
              Enter your new password below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter new password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function EmployeeResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh w-full items-center justify-center">
        <p>Loading...</p>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

