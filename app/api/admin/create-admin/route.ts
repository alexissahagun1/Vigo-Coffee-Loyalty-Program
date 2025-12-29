import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { requireAdminAuth } from "@/lib/auth/employee-auth";

/**
 * Admin API endpoint to create a new admin employee directly
 * This bypasses the invitation system for initial admin setup
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Require admin authentication (CRITICAL - this creates admin users!)
    const authError = await requireAdminAuth();
    if (authError) {
      return authError;
    }

    const { email, username, fullName, password } = await req.json();

    if (!email || !username) {
      return NextResponse.json(
        { error: "Email and username are required" },
        { status: 400 }
      );
    }

    // Generate a random password if not provided
    const adminPassword = password || randomBytes(16).toString('hex');

    if (adminPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Check if employee already exists with this email
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingEmployee) {
      return NextResponse.json(
        { error: "An employee with this email already exists" },
        { status: 400 }
      );
    }

    // Check if username already exists
    const { data: existingUsername } = await supabase
      .from('employees')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existingUsername) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 400 }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: adminPassword,
      email_confirm: true, // Auto-confirm email
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Failed to create user" },
        { status: 500 }
      );
    }

    // Create employee record with admin privileges
    const { error: employeeError } = await supabase
      .from('employees')
      .insert({
        id: authData.user.id,
        username,
        email,
        full_name: fullName || username,
        is_active: true,
        is_admin: true, // Set as admin
      });

    if (employeeError) {
      // Rollback: delete auth user if employee creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: employeeError.message || "Failed to create employee record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Admin created successfully",
      user: {
        id: authData.user.id,
        email,
        username,
        is_admin: true,
      },
      // Only return password if it was auto-generated
      ...(password ? {} : { 
        temporaryPassword: adminPassword,
        message: "Admin created successfully. Please save this temporary password and change it on first login."
      }),
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


