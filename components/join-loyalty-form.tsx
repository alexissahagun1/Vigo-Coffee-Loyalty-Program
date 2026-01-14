"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WalletSelection } from "@/components/wallet-selection";

export function JoinLoyaltyForm() {
  const [fullName, setFullName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

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
      // Trim and validate full name - Apple Wallet rejects empty strings
      const trimmedFullName = fullName.trim();
      if (!trimmedFullName) {
        setError('Full name is required');
        setIsLoading(false);
        return;
      }

      const supabase = createClient();
      
      // Check for duplicate email if provided
      const trimmedEmail = email.trim();
      if (trimmedEmail) {
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('id, email')
          .eq('email', trimmedEmail)
          .not('email', 'is', null)
          .maybeSingle();
        
        if (checkError) {
          throw new Error('Failed to check email availability');
        }
        
        if (existingProfile) {
          setError('An account with this email already exists');
          setIsLoading(false);
          return;
        }
      }
      
      // Create anonymous auth user (gets unique ID automatically)
      const authResult = await supabase.auth.signInAnonymously();
      
      if (authResult.error) throw authResult.error;
      if (!authResult.data.user) throw new Error("Failed to create user");

      // User ID is automatically assigned by Supabase auth
      const userId = authResult.data.user.id;
      setUserId(userId);

      // Prepare birthday data (convert to ISO format if provided)
      let birthdayDate = null;
      if (birthday) {
        birthdayDate = new Date(birthday).toISOString().split('T')[0];
      }

      // Create profile with the auth user's ID
      // Ensure empty strings are converted to null - Apple Wallet rejects empty strings
      let profileResult = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: trimmedFullName, // Use trimmed name (guaranteed non-empty)
          birthday: birthdayDate,
          email: email.trim() || null, // Trim and convert empty to null
          phone: phone.trim() || null, // Trim and convert empty to null
          points_balance: 0,
          total_purchases: 0
        }, {
          onConflict: 'id'
        });

      // If update failed due to schema cache issue (phone column not found), retry without it
      if (profileResult.error && profileResult.error.message?.includes("phone")) {
        profileResult = await supabase
          .from('profiles')
          .upsert({
            id: userId,
            full_name: trimmedFullName,
            birthday: birthdayDate,
            email: email.trim() || null,
            points_balance: 0,
            total_purchases: 0
          }, {
            onConflict: 'id'
          });
      }

      if (profileResult.error) throw profileResult.error;

      // Verify profile was created successfully by fetching it back
      // This ensures the profile is committed to the database before redirecting
      const { data: verifyProfile, error: verifyError } = await supabase
        .from('profiles')
        .select('id, full_name, points_balance')
        .eq('id', userId)
        .single();

      if (verifyError || !verifyProfile) {
        throw new Error('Profile created but could not be verified. Please try again.');
      }

      // Ensure full_name is set (critical for pass generation)
      if (!verifyProfile.full_name || !verifyProfile.full_name.trim()) {
        // Update with full_name if somehow it's missing
        await supabase
          .from('profiles')
          .update({ full_name: trimmedFullName })
          .eq('id', userId);
      }

      // Update rate limit tracking
      localStorage.setItem('signupCount', (signupCount + 1).toString());
      localStorage.setItem('lastSignup', now.toString());

      // Show success and show wallet selection
      setSuccess(true);

    } catch (error: any) {
      setError(error.message || 'Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  if (success && userId) {
    return (
      <WalletSelection userId={userId} />
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
              <Label htmlFor="birthday">Birthday</Label>
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

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
              />
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