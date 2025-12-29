/**
 * Employee Authentication Utilities
 * 
 * This module provides helper functions to verify employee authentication
 * and authorization in API routes.
 */

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export interface EmployeeAuthResult {
  isAuthenticated: boolean;
  isEmployee: boolean;
  isActive: boolean;
  isAdmin: boolean;
  employeeId: string | null;
  error?: string;
}

/**
 * Verifies if the current user is an authenticated employee
 * @returns EmployeeAuthResult with authentication status
 */
export async function verifyEmployeeAuth(): Promise<EmployeeAuthResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        isAuthenticated: false,
        isEmployee: false,
        isActive: false,
        isAdmin: false,
        employeeId: null,
        error: 'Not authenticated',
      };
    }

    // Use service role to check employee status (bypasses RLS)
    const serviceSupabase = createServiceRoleClient();
    const { data: employee, error: employeeError } = await serviceSupabase
      .from('employees')
      .select('id, is_active, is_admin')
      .eq('id', user.id)
      .single();

    if (employeeError || !employee) {
      return {
        isAuthenticated: true,
        isEmployee: false,
        isActive: false,
        isAdmin: false,
        employeeId: null,
        error: 'User is not an employee',
      };
    }

    return {
      isAuthenticated: true,
      isEmployee: true,
      isActive: employee.is_active,
      isAdmin: employee.is_admin,
      employeeId: employee.id,
    };
  } catch (error: any) {
    return {
      isAuthenticated: false,
      isEmployee: false,
      isActive: false,
      isAdmin: false,
      employeeId: null,
      error: error.message || 'Authentication error',
    };
  }
}

/**
 * Verifies if the current user is an authenticated and active employee
 * Returns 401 response if not authenticated or not an employee
 */
export async function requireEmployeeAuth() {
  const authResult = await verifyEmployeeAuth();

  if (!authResult.isAuthenticated) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  if (!authResult.isEmployee) {
    return NextResponse.json(
      { error: 'Employee access required' },
      { status: 403 }
    );
  }

  if (!authResult.isActive) {
    return NextResponse.json(
      { error: 'Employee account is not active' },
      { status: 403 }
    );
  }

  return null; // Authentication passed
}

/**
 * Verifies if the current user is an authenticated admin
 * Returns 401/403 response if not authenticated or not an admin
 */
export async function requireAdminAuth() {
  const authResult = await verifyEmployeeAuth();

  if (!authResult.isAuthenticated) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  if (!authResult.isEmployee) {
    return NextResponse.json(
      { error: 'Employee access required' },
      { status: 403 }
    );
  }

  if (!authResult.isActive) {
    return NextResponse.json(
      { error: 'Employee account is not active' },
      { status: 403 }
    );
  }

  if (!authResult.isAdmin) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  return null; // Authentication passed
}

