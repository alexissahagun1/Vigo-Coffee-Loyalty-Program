import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/**
 * API endpoint for employee login
 * This bypasses RLS issues by using service role client
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username } = body;
    
    console.log('[Employee Login API] Received request with username:', username);

    if (!username) {
      console.log('[Employee Login API] Username missing');
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    console.log('[Employee Login API] Service role client created, querying employees table...');

    // Step 1: Look up employee by username OR email (support both)
    // Check if input looks like an email (contains @)
    const isEmail = username.includes('@');
    
    let employeeQuery;
    if (isEmail) {
      console.log('[Employee Login API] Input appears to be an email, searching by email...');
      employeeQuery = supabase
        .from('employees')
        .select('id, email, is_active')
        .eq('email', username)
        .maybeSingle();
    } else {
      console.log('[Employee Login API] Input appears to be a username, searching by username...');
      employeeQuery = supabase
        .from('employees')
        .select('id, email, is_active')
        .eq('username', username)
        .maybeSingle();
    }

    const { data: employee, error: employeeError } = await employeeQuery;

    console.log('[Employee Login API] Query result:', { 
      hasEmployee: !!employee, 
      employeeError: employeeError?.message,
      employeeId: employee?.id,
      employeeEmail: employee?.email,
      isActive: employee?.is_active
    });

    if (employeeError && employeeError.code !== 'PGRST116') {
      // PGRST116 is "no rows found" which is handled below
      console.error('[Employee Login API] Database error:', employeeError);
      return NextResponse.json(
        { error: "Invalid username or password", details: employeeError.message },
        { status: 401 }
      );
    }

    if (!employee) {
      console.log('[Employee Login API] No employee found with', isEmail ? 'email' : 'username', ':', username);
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

