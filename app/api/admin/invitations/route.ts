import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdminAuth } from "@/lib/auth/employee-auth";

// GET - List all invitations
export async function GET(req: NextRequest) {
  try {
    // SECURITY: Require admin authentication
    const authError = await requireAdminAuth();
    if (authError) {
      return authError;
    }

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('employee_invitations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, invitations: data || [] });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


