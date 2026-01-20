export interface GiftCard {
  id: string;
  serial_number: string;
  created_by_id: string;
  recipient_name: string;
  balance_mxn: number;
  initial_balance_mxn: number;
  share_token: string;
  recipient_user_id: string | null;
  claimed_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GiftCardTransaction {
  id: string;
  gift_card_id: string;
  employee_id: string | null;
  amount_mxn: number;
  balance_after_mxn: number;
  description: string | null;
  created_at: string;
}

export interface CreateGiftCardRequest {
  recipientName: string;
  initialBalanceMxn: number;
}

export interface ShareGiftCardResponse {
  giftCard: GiftCard;
  shareableLink: string;
}

export interface GiftCardStats {
  totalGiftCards: number;
  totalBalanceIssued: number;
  totalBalanceRemaining: number;
  totalBalanceUsed: number;
  activeGiftCards: number;
  claimedGiftCards: number;
  averageGiftCardValue: number;
  topGiftCards: Array<{
    id: string;
    serial_number: string;
    recipient_name: string;
    balance_mxn: number;
    initial_balance_mxn: number;
  }>;
}
