import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, createClient } from "@/lib/supabase/server";

// GET - List all employees
export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, employees: data || [] });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update employee
export async function PUT(req: NextRequest) {
  try {
    const { id, ...updates } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Check if username is being updated and if it's already taken
    if (updates.username) {
      const { data: existing, error: checkError } = await supabase
        .from('employees')
        .select('id')
        .eq('username', updates.username)
        .neq('id', id)
        .maybeSingle();

      // If found an existing employee with this username, it's taken
      if (existing) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 400 }
        );
      }
    }

    // Get current user making the request to prevent self-deactivation
    const regularSupabase = await createClient();
    const { data: { user } } = await regularSupabase.auth.getUser();
    
    // Get the employee being updated to check if they're an admin
    const { data: targetEmployee } = await supabase
      .from('employees')
      .select('is_admin')
      .eq('id', id)
      .single();

    // Prevent admin from deactivating themselves or removing their own admin status
    if (user && id === user.id && targetEmployee?.is_admin) {
      if (updates.is_active === false) {
        return NextResponse.json(
          { error: "You cannot deactivate your own admin account" },
          { status: 400 }
        );
      }
      if (updates.is_admin === false) {
        return NextResponse.json(
          { error: "You cannot remove admin status from your own account" },
          { status: 400 }
        );
      }
    }

    const { data, error } = await supabase
      .from('employees')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, employee: data });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete employee (soft delete by setting is_active to false)
export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.js
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('employees')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

