import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Admin API endpoint to reset an employee's password
 * This bypasses the email reset flow for quick password resets
 */
export async function POST(req: NextRequest) {
  try {
    const { email, newPassword } = await req.json();

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: "Email and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Verify employee exists
    const { data: employee } = await supabase
      .from('employees')
      .select('id, email')
      .eq('email', email)
      .single();

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Update password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      employee.id,
      {
        password: newPassword,
      }
    );

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to update password" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

