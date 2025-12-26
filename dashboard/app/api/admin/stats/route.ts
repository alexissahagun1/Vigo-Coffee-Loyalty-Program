import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    // Fetch all statistics in parallel
    const [customersResult, employeesResult, invitationsResult] = await Promise.all([
      // Get customer stats
      supabase
        .from('profiles')
        .select('points_balance, total_purchases', { count: 'exact' }),
      
      // Get employee stats
      supabase
        .from('employees')
        .select('is_active', { count: 'exact' }),
      
      // Get pending invitations
      supabase
        .from('employee_invitations')
        .select('id', { count: 'exact' })
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
    ])

    if (customersResult.error) throw customersResult.error
    if (employeesResult.error) throw employeesResult.error
    if (invitationsResult.error) throw invitationsResult.error

    const customers = customersResult.data || []
    const employees = employeesResult.data || []
    const totalEmployees = employeesResult.count || 0
    const activeEmployees = employees.filter(e => e.is_active).length
    const pendingInvitations = invitationsResult.count || 0

    // Calculate totals
    const totalPoints = customers.reduce((sum, c) => sum + (c.points_balance || 0), 0)
    const totalPurchases = customers.reduce((sum, c) => sum + (c.total_purchases || 0), 0)

    // Get top 5 customers by points
    const topCustomersResult = await supabase
      .from('profiles')
      .select('id, full_name, points_balance, total_purchases')
      .order('points_balance', { ascending: false })
      .limit(5)

    if (topCustomersResult.error) throw topCustomersResult.error

    return NextResponse.json({
      success: true,
      stats: {
        totalCustomers: customersResult.count || 0,
        totalEmployees,
        activeEmployees,
        totalPoints,
        totalPurchases,
        pendingInvitations,
        topCustomers: topCustomersResult.data || []
      }
    })
  } catch (error: any) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}

