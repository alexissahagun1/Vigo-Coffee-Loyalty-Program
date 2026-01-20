import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { requireEmployeeAuth } from "@/lib/auth/employee-auth";

// GET - Get single gift card details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireEmployeeAuth();
    if (authError) {
      return authError;
    }

    const { id } = await params;
    const supabase = createServiceRoleClient();

    const { data: giftCard, error } = await supabase
      .from('gift_cards')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !giftCard) {
      return NextResponse.json(
        { error: "Gift card not found" },
        { status: 404 }
      );
    }

    // Get transaction history
    const { data: transactions } = await supabase
      .from('gift_card_transactions')
      .select('*')
      .eq('gift_card_id', id)
      .order('created_at', { ascending: false });

    // Get recipient profile if claimed
    let recipientProfile = null;
    if (giftCard.recipient_user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .eq('id', giftCard.recipient_user_id)
        .single();
      recipientProfile = profile;
    }

    return NextResponse.json({
      success: true,
      giftCard: {
        ...giftCard,
        transactions: transactions || [],
        recipientProfile,
      },
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update gift card (e.g., toggle active status)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireEmployeeAuth();
    if (authError) {
      return authError;
    }

    const { id } = await params;
    const body = await req.json();
    const supabase = createServiceRoleClient();

    // Only allow updating is_active for now
    const updateData: any = {};
    if (typeof body.is_active === 'boolean') {
      updateData.is_active = body.is_active;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data: giftCard, error } = await supabase
      .from('gift_cards')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to update gift card" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      giftCard,
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
