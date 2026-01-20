import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient, createClient } from "@/lib/supabase/server";
import { requireEmployeeAuth, verifyEmployeeAuth } from "@/lib/auth/employee-auth";
import { notifyGiftCardUpdate } from "@/lib/passkit/gift-card-push-notifications";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  console.log(`💳 [GIFT CARD PURCHASE] Purchase endpoint called`);
  try {
    // SECURITY: Require employee authentication
    const authError = await requireEmployeeAuth();
    if (authError) {
      console.log(`💳 [GIFT CARD PURCHASE] Authentication failed`);
      return authError;
    }
    console.log(`💳 [GIFT CARD PURCHASE] Authentication passed`);

    const body = await req.json();
    const giftCardId = body.giftCardId;
    const saleTotal = parseFloat(body.saleTotal || body.amount);

    // Validate inputs
    if (!giftCardId || typeof giftCardId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid giftCardId' },
        { status: 400 }
      );
    }

    if (!saleTotal || isNaN(saleTotal) || saleTotal <= 0) {
      return NextResponse.json(
        { error: 'Missing or invalid saleTotal. Must be greater than 0.' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();

    // Get gift card
    const { data: giftCard, error: giftCardError } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('id', giftCardId)
      .single();

    if (giftCardError || !giftCard) {
      return NextResponse.json(
        { error: 'Gift card not found' },
        { status: 404 }
      );
    }

    // Check if gift card is active
    if (!giftCard.is_active) {
      return NextResponse.json(
        { error: 'Gift card is inactive' },
        { status: 400 }
      );
    }

    const currentBalance = Number(giftCard.balance_mxn) || 0;

    // Check if balance is sufficient
    if (currentBalance < saleTotal) {
      return NextResponse.json(
        { 
          error: 'Insufficient balance',
          currentBalance,
          requiredAmount: saleTotal,
          shortfall: saleTotal - currentBalance
        },
        { status: 400 }
      );
    }

    // Calculate new balance
    const newBalance = currentBalance - saleTotal;

    // Get employee ID
    let employeeId: string | null = null;
    try {
      const authSupabase = await createClient();
      const { data: { user } } = await authSupabase.auth.getUser();
      if (user) {
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('id', user.id)
          .single();
        if (employee) {
          employeeId = user.id;
        }
      }
    } catch (err) {
      console.log('Could not get employee ID:', err);
    }

    // Update gift card balance
    const updateData: any = {
      balance_mxn: newBalance,
      updated_at: new Date().toISOString(),
    };

    // Mark as claimed if this is the first use
    if (!giftCard.claimed_at) {
      updateData.claimed_at = new Date().toISOString();
    }

    const { data: updatedGiftCard, error: updateError } = await supabase
      .from('gift_cards')
      .update(updateData)
      .eq('id', giftCardId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update gift card:', updateError);
      return NextResponse.json(
        { error: 'Failed to update gift card balance' },
        { status: 500 }
      );
    }

    // Create transaction record
    try {
      const { error: transactionError } = await supabase
        .from('gift_card_transactions')
        .insert({
          gift_card_id: giftCardId,
          employee_id: employeeId,
          amount_mxn: -saleTotal, // Negative for deduction
          balance_after_mxn: newBalance,
          description: `Purchase: ${saleTotal.toFixed(2)} MXN`,
        });

      if (transactionError) {
        console.error('⚠️ Transaction logging failed (non-critical):', transactionError);
      }
    } catch (transactionError: any) {
      console.error('⚠️ Transaction logging failed (non-critical):', transactionError?.message);
    }

    // Send push notification to update Apple Wallet pass
    try {
      console.log(`💳 [PURCHASE] Attempting to send push notification for gift card ${updatedGiftCard.serial_number}`);
      const notifiedCount = await notifyGiftCardUpdate(updatedGiftCard.serial_number);
      if (notifiedCount > 0) {
        console.log(`💳 [PURCHASE] ✅ Push notification sent to ${notifiedCount} device(s) for gift card ${updatedGiftCard.serial_number}`);
      } else {
        console.log(`💳 [PURCHASE] ⚠️  No devices notified. Possible reasons:`);
        console.log(`   - Pass not yet registered (Apple registers within 1-2 minutes of adding to Wallet)`);
        console.log(`   - APNs not configured (check environment variables)`);
        console.log(`   - Pass was added on localhost/local network (webServiceURL not set)`);
      }
    } catch (pushError: any) {
      // Don't fail the purchase if push notification fails
      console.error('💳 [PURCHASE] ⚠️ Failed to send push notification (non-critical):', pushError?.message);
      console.error('   Stack:', pushError?.stack);
    }

    console.log(`✅ Gift card purchase successful: ${giftCardId}, Deducted: ${saleTotal} MXN, New Balance: ${newBalance} MXN`);

    return NextResponse.json({
      success: true,
      giftCard: {
        id: updatedGiftCard.id,
        serialNumber: updatedGiftCard.serial_number,
        recipientName: updatedGiftCard.recipient_name,
        balance: newBalance,
        initialBalance: Number(updatedGiftCard.initial_balance_mxn),
      },
      transaction: {
        amount: saleTotal,
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
      },
      message: `Purchase successful. Remaining balance: ${newBalance.toFixed(2)} MXN`,
    });

  } catch (error: any) {
    console.error('❌ Gift card purchase error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error?.message
      },
      { status: 500 }
    );
  }
}
