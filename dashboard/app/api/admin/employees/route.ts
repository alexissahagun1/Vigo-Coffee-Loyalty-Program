import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      employees: data || []
    })
  } catch (error: any) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createServiceRoleClient()
    const body = await request.json()
    const { id, username, full_name, is_active, is_admin } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required' },
        { status: 400 }
      )
    }

    // Get current employee to check if they're trying to modify themselves
    const { data: currentEmployee, error: fetchError } = await supabase
      .from('employees')
      .select('id, is_admin, is_active')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError
    if (!currentEmployee) {
      return NextResponse.json(
        { success: false, error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Get current user from session to prevent self-modification
    const { data: { user } } = await supabase.auth.getUser()
    const isSelf = user?.id === id

    // Prevent admins from removing their own admin status
    if (isSelf && is_admin === false && currentEmployee.is_admin) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove your own admin status' },
        { status: 400 }
      )
    }

    // Prevent admins from deactivating themselves
    if (isSelf && is_active === false && currentEmployee.is_active) {
      return NextResponse.json(
        { success: false, error: 'Cannot deactivate your own account' },
        { status: 400 }
      )
    }

    // Check username uniqueness if username is being changed
    if (username && username !== currentEmployee.username) {
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('username', username)
        .single()

      if (existingEmployee) {
        return NextResponse.json(
          { success: false, error: 'Username already exists' },
          { status: 400 }
        )
      }
    }

    // Update employee
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (username !== undefined) updateData.username = username
    if (full_name !== undefined) updateData.full_name = full_name
    if (is_active !== undefined) updateData.is_active = is_active
    if (is_admin !== undefined) updateData.is_admin = is_admin

    const { data, error } = await supabase
      .from('employees')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      employee: data
    })
  } catch (error: any) {
    console.error('Error updating employee:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update employee' },
      { status: 500 }
    )
  }
}

