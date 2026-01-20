-- ============================================
-- Gift Cards Database Schema
-- Run this SQL in your Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. GIFT_CARDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number TEXT NOT NULL UNIQUE,
  created_by_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  balance_mxn DECIMAL(10,2) NOT NULL DEFAULT 0,
  initial_balance_mxn DECIMAL(10,2) NOT NULL,
  share_token TEXT NOT NULL UNIQUE,
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for gift_cards table
CREATE INDEX IF NOT EXISTS idx_gift_cards_serial_number ON gift_cards(serial_number);
CREATE INDEX IF NOT EXISTS idx_gift_cards_share_token ON gift_cards(share_token);
CREATE INDEX IF NOT EXISTS idx_gift_cards_recipient_user_id ON gift_cards(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_created_by_id ON gift_cards(created_by_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_is_active ON gift_cards(is_active);
CREATE INDEX IF NOT EXISTS idx_gift_cards_created_at ON gift_cards(created_at);

-- ============================================
-- 2. GIFT_CARD_TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS gift_card_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id UUID NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  amount_mxn DECIMAL(10,2) NOT NULL,
  balance_after_mxn DECIMAL(10,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for gift_card_transactions table
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_gift_card_id ON gift_card_transactions(gift_card_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_created_at ON gift_card_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_gift_card_transactions_employee_id ON gift_card_transactions(employee_id);

-- ============================================
-- 3. TRIGGERS
-- ============================================

-- Trigger to update updated_at timestamp on gift_cards
CREATE OR REPLACE FUNCTION update_gift_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_gift_cards_updated_at
  BEFORE UPDATE ON gift_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_gift_cards_updated_at();

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on gift_cards table
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;

-- Enable RLS on gift_card_transactions table
ALTER TABLE gift_card_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Employees/Admins can view all gift cards
CREATE POLICY "Employees can view all gift cards" ON gift_cards
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- RLS Policy: Employees/Admins can create gift cards
CREATE POLICY "Employees can create gift cards" ON gift_cards
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- RLS Policy: Employees/Admins can update gift cards
CREATE POLICY "Employees can update gift cards" ON gift_cards
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- RLS Policy: Employees/Admins can view all gift card transactions
CREATE POLICY "Employees can view gift card transactions" ON gift_card_transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- RLS Policy: Employees/Admins can create gift card transactions
CREATE POLICY "Employees can create gift card transactions" ON gift_card_transactions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- ============================================
-- 5. COMMENTS
-- ============================================
COMMENT ON TABLE gift_cards IS 'Gift cards with MXN balance for Apple Wallet';
COMMENT ON COLUMN gift_cards.serial_number IS 'Unique serial number used as Apple Wallet pass serial number';
COMMENT ON COLUMN gift_cards.share_token IS 'Cryptographically secure token for shareable link';
COMMENT ON COLUMN gift_cards.recipient_user_id IS 'Auto-created user ID when recipient first uses the card';
COMMENT ON COLUMN gift_cards.claimed_at IS 'Timestamp when recipient first used the gift card';
COMMENT ON TABLE gift_card_transactions IS 'Transaction history for gift card balance deductions';
