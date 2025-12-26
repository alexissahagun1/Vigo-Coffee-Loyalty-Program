import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * Check if an email belongs to an employee
 * Used for password reset verification
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    const { data: employee, error } = await supabase
      .from('employees')
      .select('email, is_active')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!employee) {
      return NextResponse.json(
        { error: "No employee account found with this email" },
        { status: 404 }
      );
    }

    if (!employee.is_active) {
      return NextResponse.json(
        { error: "Employee account is not active" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      employee: {
        email: employee.email,
        is_active: employee.is_active,
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

