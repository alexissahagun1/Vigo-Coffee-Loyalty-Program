"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function JoinLoyaltyForm() {
  const [fullName, setFullName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple rate limiting: Check localStorage
    const signupCount = parseInt(localStorage.getItem('signupCount') || '0');
    const lastSignup = localStorage.getItem('lastSignup');
    const now = Date.now();
    
    // Max 3 signups per hour per device
    if (signupCount > 0 && lastSignup) {
      const hoursSince = (now - parseInt(lastSignup)) / (1000 * 60 * 60);
      if (hoursSince < 1 && signupCount >= 2) {
        setError('Please wait before creating another account. Maximum 2 accounts per hour.');
        return;
      }
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      
      // Create anonymous auth user (gets unique ID automatically)
      const authResult = await supabase.auth.signInAnonymously();
      
      if (authResult.error) throw authResult.error;
      if (!authResult.data.user) throw new Error("Failed to create user");

      // User ID is automatically assigned by Supabase auth
      const userId = authResult.data.user.id;

      // Prepare birthday data (convert to ISO format if provided)
      let birthdayDate = null;
      if (birthday) {
        birthdayDate = new Date(birthday).toISOString().split('T')[0];
      }

      // Create profile with the auth user's ID
      const profileResult = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: fullName,
          birthday: birthdayDate,
          points_balance: 0,
          total_purchases: 0
        }, {
          onConflict: 'id'
        });

      if (profileResult.error) throw profileResult.error;

      // Update rate limit tracking
      localStorage.setItem('signupCount', (signupCount + 1).toString());
      localStorage.setItem('lastSignup', now.toString());

      // Show success and redirect to wallet download
      setSuccess(true);
      
      // Wait a moment then redirect
      setTimeout(() => {
        window.location.href = '/api/wallet';
      }, 1500);

    } catch (error: any) {
      setError(error.message || 'Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="text-6xl">🎉</div>
            <h2 className="text-2xl font-bold text-green-600">Success!</h2>
            <p className="text-gray-600">Creating your loyalty card...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Get Your Loyalty Card</CardTitle>
        <CardDescription>
          Enter your information to join our loyalty program
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleJoin}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <div>
              <Label htmlFor="birthday">Birthday (Optional)</Label>
              <Input
                id="birthday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Get special promotions on your birthday!
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              size="lg"
            >
              {isLoading ? "Creating your card..." : "Get My Loyalty Card ☕️"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}