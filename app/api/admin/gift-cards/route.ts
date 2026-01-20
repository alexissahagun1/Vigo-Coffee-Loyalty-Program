import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { randomBytes, randomUUID } from "crypto";
import { requireEmployeeAuth, verifyEmployeeAuth } from "@/lib/auth/employee-auth";

// GET - List all gift cards
export async function GET(req: NextRequest) {
  try {
    // SECURITY: Require employee authentication
    const authError = await requireEmployeeAuth();
    if (authError) {
      return authError;
    }

    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // active, inactive, all
    const search = searchParams.get("search"); // search by serial number or recipient name

    let query = supabase
      .from('gift_cards')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply status filter
    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    // Apply search filter
    if (search) {
      query = query.or(`serial_number.ilike.%${search}%,recipient_name.ilike.%${search}%`);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, giftCards: data || [] });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new gift card
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Require employee authentication
    const authError = await requireEmployeeAuth();
    if (authError) {
      return authError;
    }

    const { recipientName, initialBalanceMxn } = await req.json();

    // Validate recipient name is required and non-empty
    const trimmedRecipientName = recipientName?.trim();
    if (!trimmedRecipientName) {
      return NextResponse.json(
        { error: "Recipient name is required" },
        { status: 400 }
      );
    }

    // Validate initial balance
    const balance = parseFloat(initialBalanceMxn);
    if (isNaN(balance) || balance < 10) {
      return NextResponse.json(
        { error: "Initial balance must be at least 10 MXN" },
        { status: 400 }
      );
    }

    // Get current user (employee who created the gift card)
    const authResult = await verifyEmployeeAuth();
    if (!authResult.isEmployee || !authResult.employeeId) {
      return NextResponse.json(
        { error: "Employee authentication required" },
        { status: 401 }
      );
    }

    const supabase = createServiceRoleClient();

    // Generate unique serial number (UUID)
    const serialNumber = randomUUID();

    // Generate unique share token (32 bytes = 256 bits, hex encoded = 64 chars)
    const shareToken = randomBytes(32).toString('hex');

    // Get base URL for shareable link from the actual request
    // This ensures it works whether accessed via localhost or local network IP
    let baseUrl: string;
    
    if (process.env.NEXT_PUBLIC_APP_URL) {
      // Use explicit environment variable if set (for production)
      baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    } else {
      // Use nextUrl.origin which contains the full origin (protocol + host) from the request
      // If accessed via http://192.168.1.XXX:3000, it will use that IP
      // If accessed via http://localhost:3000, it will use localhost
      baseUrl = req.nextUrl.origin;
    }
    
    // Ensure baseUrl has protocol
    if (!baseUrl.startsWith('http')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    const shareableLink = `${baseUrl}/gift-card/${shareToken}`;

    // Create gift card record
    const { data: giftCard, error: createError } = await supabase
      .from('gift_cards')
      .insert({
        serial_number: serialNumber,
        created_by_id: authResult.employeeId,
        recipient_name: trimmedRecipientName,
        balance_mxn: balance,
        initial_balance_mxn: balance,
        share_token: shareToken,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { error: createError.message || "Failed to create gift card" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      giftCard: {
        ...giftCard,
        shareableLink,
        share_token: shareToken, // Include share_token so client can reconstruct URL
      },
      message: "Gift card created successfully"
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
