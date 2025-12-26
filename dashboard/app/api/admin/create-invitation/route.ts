import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

export async function POST(request: Request) {
  try {
    const supabase = createServiceRoleClient()
    const body = await request.json()
    const { email } = body

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid email address is required' },
        { status: 400 }
      )
    }

    // Check if employee with this email already exists
    const { data: existingEmployee } = await supabase
      .from('employees')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingEmployee) {
      return NextResponse.json(
        { success: false, error: 'An employee with this email already exists' },
        { status: 400 }
      )
    }

    // Generate secure token
    const token = randomBytes(24).toString('hex')
    
    // Set expiration to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invitation
    const { data, error } = await supabase
      .from('employee_invitations')
      .insert({
        email: email.toLowerCase(),
        token,
        expires_at: expiresAt.toISOString(),
        used_at: null
      })
      .select()
      .single()

    if (error) throw error

    // Generate invitation URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${appUrl}/auth/employee/invite/${token}`

    return NextResponse.json({
      success: true,
      invitation: data,
      inviteUrl
    })
  } catch (error: any) {
    console.error('Error creating invitation:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create invitation' },
      { status: 500 }
    )
  }
}

