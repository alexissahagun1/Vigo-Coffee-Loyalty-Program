import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, createClient } from "@/lib/supabase/server";

/**
 * API endpoint to check if the current user is an employee
 * This bypasses RLS issues by using service role client
 */
export async function GET(req: NextRequest) {
  try {
    // Get the authenticated user from the request
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Use service role to check employee status (bypasses RLS)
    const serviceSupabase = createServiceRoleClient();
    const { data: employee, error: employeeError } = await serviceSupabase
      .from('employees')
      .select('id, is_active, is_admin')
      .eq('id', user.id)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { success: false, isEmployee: false },
        { status: 200 }
      );
    }

    if (!employee.is_active) {
      return NextResponse.json(
        { success: false, isEmployee: false, reason: "Account is not active" },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      isEmployee: true,
      isActive: employee.is_active,
      isAdmin: employee.is_admin,
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


