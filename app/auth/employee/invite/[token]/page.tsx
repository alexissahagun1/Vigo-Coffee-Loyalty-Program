"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";

function AcceptInvitationContent() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      const supabase = createClient();
      
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      // If user is logged in, check if they're an employee
      if (user) {
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('id', user.id)
          .single();

        // If logged in but NOT an employee (anonymous customer), redirect away
        if (!employee) {
          router.push('/');
          return;
        }
        // If already an employee, they don't need this page
        if (employee) {
          router.push('/scan');
          return;
        }
      }

      // Validate invitation token
      try {
        const res = await fetch(`/api/admin/validate-invitation?token=${token}`);
        const data = await res.json();
        
        if (data.error) {
          setError(data.error);
        } else {
          setEmail(data.invitation.email);
        }
      } catch (err) {
        setError("Failed to validate invitation");
      } finally {
        setIsValidating(false);
      }
    };

    checkAccess();
  }, [token, router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/accept-invitation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, username, password, fullName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push('/login?success=Account created successfully');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p>Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !email) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <CardTitle className="text-2xl">Complete Your Registration</CardTitle>
            </div>
            <CardDescription>
              You've been invited to join as an employee. Complete your account setup.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              <div>
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p>Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <AcceptInvitationContent />
    </Suspense>
  );
}

