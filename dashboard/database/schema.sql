-- Admin Dashboard Database Schema
-- Run this SQL in your Supabase SQL Editor to set up the required tables

-- ============================================
-- 1. EMPLOYEES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  full_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for employees table
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_username ON employees(username);
CREATE INDEX IF NOT EXISTS idx_employees_is_admin ON employees(is_admin);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);

-- ============================================
-- 2. EMPLOYEE_INVITATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS employee_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for employee_invitations table
CREATE INDEX IF NOT EXISTS idx_invitations_token ON employee_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON employee_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON employee_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_used_at ON employee_invitations(used_at);

-- ============================================
-- 3. PROFILES TABLE (for customers)
-- ============================================
-- Note: This table may already exist in your Supabase project
-- Only create if it doesn't exist, or add missing columns if it does

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  points_balance INTEGER NOT NULL DEFAULT 0,
  total_purchases INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns if profiles table exists but columns are missing
DO $$ 
BEGIN
  -- Add points_balance if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'points_balance') THEN
    ALTER TABLE profiles ADD COLUMN points_balance INTEGER NOT NULL DEFAULT 0;
  END IF;

  -- Add total_purchases if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'total_purchases') THEN
    ALTER TABLE profiles ADD COLUMN total_purchases INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Indexes for profiles table
CREATE INDEX IF NOT EXISTS idx_profiles_points_balance ON profiles(points_balance);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ============================================
-- 4. TRIGGERS
-- ============================================

-- Trigger to update updated_at timestamp on employees
CREATE OR REPLACE FUNCTION update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION update_employees_updated_at();

-- Trigger to update updated_at timestamp on profiles
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- Note: The dashboard uses service role key which bypasses RLS
-- These policies are for additional security if needed

-- Enable RLS on employees table
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Enable RLS on employee_invitations table
ALTER TABLE employee_invitations ENABLE ROW LEVEL SECURITY;

-- Enable RLS on profiles table (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (adjust based on your security requirements)
-- Employees can view their own record
CREATE POLICY "Employees can view own record" ON employees
  FOR SELECT
  USING (auth.uid() = id);

-- Admins can view all employees (if you want to use RLS instead of service role)
-- CREATE POLICY "Admins can view all employees" ON employees
--   FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM employees
--       WHERE id = auth.uid() AND is_admin = true AND is_active = true
--     )
--   );

-- ============================================
-- 6. COMMENTS
-- ============================================
COMMENT ON TABLE employees IS 'Employee accounts for admin dashboard access';
COMMENT ON TABLE employee_invitations IS 'Invitation tokens for employee registration';
COMMENT ON TABLE profiles IS 'Customer profiles with loyalty points and purchase history';

