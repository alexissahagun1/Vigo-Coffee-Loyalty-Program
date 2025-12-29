import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

// GET - List all customers
export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, customers: data || [] });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new customer
export async function POST(req: NextRequest) {
  try {
    const { fullName, email, phone, birthday } = await req.json();

    // Validate full name is required and non-empty
    const trimmedFullName = fullName?.trim();
    if (!trimmedFullName) {
      return NextResponse.json(
        { error: "Full name is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Generate a unique email for anonymous user (won't be used for login)
    // Format: anonymous-{timestamp}-{random}@vigo-loyalty.local
    const anonymousEmail = `anonymous-${Date.now()}-${randomBytes(8).toString('hex')}@vigo-loyalty.local`;
    const anonymousPassword = randomBytes(32).toString('hex');

    // Create anonymous auth user using admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: anonymousEmail,
      password: anonymousPassword,
      email_confirm: true, // Auto-confirm email
    });
    
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Failed to create user" },
        { status: 500 }
      );
    }

    // User ID is automatically assigned by Supabase auth
    const userId = authData.user.id;

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
        email: email?.trim() || null, // Trim and convert empty to null
        phone: phone?.trim() || null, // Trim and convert empty to null
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
          email: email?.trim() || null,
          points_balance: 0,
          total_purchases: 0
        }, {
          onConflict: 'id'
        });
    }

    if (profileResult.error) {
      // Rollback: delete auth user if profile creation fails
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: profileResult.error.message || "Failed to create profile" },
        { status: 500 }
      );
    }

    // Verify profile was created successfully by fetching it back
    // This ensures the profile is committed to the database
    const { data: verifyProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, points_balance')
      .eq('id', userId)
      .single();

    if (verifyError || !verifyProfile) {
      // Rollback: delete auth user if verification fails
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: 'Profile created but could not be verified. Please try again.' },
        { status: 500 }
      );
    }

    // Ensure full_name is set (critical for pass generation)
    if (!verifyProfile.full_name || !verifyProfile.full_name.trim()) {
      // Update with full_name if somehow it's missing
      await supabase
        .from('profiles')
        .update({ full_name: trimmedFullName })
        .eq('id', userId);
    }

    return NextResponse.json({
      success: true,
      customer: verifyProfile,
      message: "Customer created successfully"
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

