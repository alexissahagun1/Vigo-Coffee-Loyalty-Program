-- ============================================
-- RLS Security Policies for Anonymous Users
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Ensure RLS is enabled on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Add INSERT policy for users to create their own profile
-- This allows anonymous users to create their profile during signup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'users_can_insert_own_profile'
      AND cmd = 'INSERT'
  ) THEN
    CREATE POLICY "users_can_insert_own_profile"
      ON profiles FOR INSERT
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Step 3: Verify all policies exist
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Users can view their own profile'
    WHEN cmd = 'INSERT' THEN 'Users can create their own profile'
    WHEN cmd = 'UPDATE' THEN 'Users can update their own profile'
    ELSE 'Other operation'
  END as description
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY cmd;

-- Step 4: Important Security Note
-- The purchase API uses service role (bypasses RLS) to update points
-- This is correct - only employees with API key can add points
-- Customers cannot modify their own points directly

-- Step 5: Verify RLS is working correctly
-- This query should show that RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';

