import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { token, username, password, fullName } = await req.json();

    if (!token || !username || !password || !fullName) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Validate invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('employee_invitations')
      .select('*')
      .eq('token', token)
      .is('used_at', null)
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 400 }
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Check if username already exists
    const { data: existingEmployee, error: usernameCheckError } = await supabase
      .from('employees')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    // If found an existing employee with this username, it's taken
    if (existingEmployee) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 400 }
      );
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true, // Auto-confirm email
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Failed to create user" },
        { status: 500 }
      );
    }

    // Create employee record
    const { error: employeeError } = await supabase
      .from('employees')
      .insert({
        id: authData.user.id,
        username,
        email: invitation.email,
        full_name: fullName,
        is_active: true, // Auto-activate since they used invitation
        is_admin: false, // New employees are not admins by default
      });

    if (employeeError) {
      // Rollback: delete auth user if employee creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: employeeError.message || "Failed to create employee record" },
        { status: 500 }
      );
    }

    // Mark invitation as used
    await supabase
      .from('employee_invitations')
      .update({ used_at: new Date().toISOString() })
      .eq('id', invitation.id);

    return NextResponse.json({
      success: true,
      message: "Account created successfully",
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

