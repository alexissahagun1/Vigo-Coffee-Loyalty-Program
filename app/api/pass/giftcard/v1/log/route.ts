import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/pass/giftcard/v1/log
 * 
 * Receives error logs from Apple Wallet for gift card passes
 * Called by Apple when there are issues with pass updates
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    
    // Log errors from Apple for debugging
    console.error('💳 Apple Wallet Gift Card Error Log:', body);
    
    // Apple expects 200 OK response
    return new NextResponse('OK', { status: 200 });
  } catch (error: any) {
    console.error('Error processing Apple gift card log:', error);
    return new NextResponse('OK', { status: 200 }); // Always return 200
  }
}
