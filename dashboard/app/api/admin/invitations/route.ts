import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('employee_invitations')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      success: true,
      invitations: data || []
    })
  } catch (error: any) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}

