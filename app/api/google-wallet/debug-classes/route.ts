import { NextRequest, NextResponse } from 'next/server';
import { listLoyaltyClasses } from '@/lib/google-wallet/class-manager';
import { isGoogleWalletConfigured } from '@/lib/google-wallet/auth';

/**
 * Debug endpoint to list all existing Google Wallet loyalty classes
 * GET /api/google-wallet/debug-classes
 * 
 * This helps identify the correct class ID if one was created in the Google Wallet Console
 */
export async function GET(req: NextRequest) {
  try {
    if (!isGoogleWalletConfigured()) {
      return NextResponse.json(
        { error: 'Google Wallet is not configured' },
        { status: 500 }
      );
    }

    const classIds = await listLoyaltyClasses();

    return NextResponse.json({
      success: true,
      count: classIds.length,
      classes: classIds,
      message: classIds.length > 0
        ? 'Found existing classes. Use the suffix (part after the dot) as GOOGLE_WALLET_CLASS_ID'
        : 'No existing classes found. A new class will be created.',
    });
  } catch (error: any) {
    console.error('❌ Error listing loyalty classes:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list loyalty classes',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

