import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";
import { requireAdminAuth } from "@/lib/auth/employee-auth";

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Require admin authentication
    const authError = await requireAdminAuth();
    if (authError) {
      return authError;
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Generate secure token
    const token = randomBytes(24).toString('hex');
    
    // Set expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

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

    // Create invitation
    const { data, error } = await supabase
      .from('employee_invitations')
      .insert({
        email,
        token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Check if it's a unique constraint violation (token collision - very rare)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: "Token collision occurred. Please try again." },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/employee/invite/${token}`;

    return NextResponse.json({
      success: true,
      invitation: data,
      inviteUrl,
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

