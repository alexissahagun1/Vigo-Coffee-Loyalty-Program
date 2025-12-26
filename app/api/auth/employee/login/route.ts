import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * API endpoint for employee login
 * This bypasses RLS issues by using service role client
 */
export async function POST(req: NextRequest) {
  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Step 1: Look up employee by username
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id, email, is_active')
      .eq('username', username)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // Step 2: Check if employee account is active
    if (!employee.is_active) {
      return NextResponse.json(
        { error: "Account is not active" },
        { status: 403 }
      );
    }

    // Step 3: Verify password using Supabase Auth
    // We need to use the admin API to verify password
    // For now, we'll return the email so the client can authenticate
    // The actual password verification happens client-side with Supabase Auth
    
    return NextResponse.json({
      success: true,
      email: employee.email,
      userId: employee.id,
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

