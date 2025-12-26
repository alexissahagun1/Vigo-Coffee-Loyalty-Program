import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, points_balance, total_purchases, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    return NextResponse.json({
      success: true,
      customers: data || []
    })
  } catch (error: any) {
    console.error('Error fetching customers:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}

