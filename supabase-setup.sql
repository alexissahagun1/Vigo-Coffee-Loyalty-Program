-- ============================================
-- Vigo Loyalty Program - Supabase Setup Script
-- Project: oraffmhquiafblhtkldx.supabase.co
-- ============================================

-- Step 1: Check if profiles table exists and has loyalty columns
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 2: Add loyalty program columns if they don't exist
DO $$
BEGIN
  -- Add points_balance column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'points_balance'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN points_balance INTEGER DEFAULT 0 NOT NULL;
    
    COMMENT ON COLUMN profiles.points_balance IS 'Current loyalty points balance for the user';
  END IF;

  -- Add total_purchases column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'total_purchases'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN total_purchases INTEGER DEFAULT 0 NOT NULL;
    
    COMMENT ON COLUMN profiles.total_purchases IS 'Total number of purchases made by the user';
  END IF;
END $$;

-- Step 3: Update existing profiles with default values
UPDATE profiles 
SET 
  points_balance = COALESCE(points_balance, 0),
  total_purchases = COALESCE(total_purchases, 0)
WHERE points_balance IS NULL OR total_purchases IS NULL;

-- Step 4: Verify RLS is enabled on profiles table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Step 5: Check existing RLS policies on profiles
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';

-- Step 6: Ensure RLS policies allow users to read/update their own profile
-- Check if a policy exists for SELECT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'users_can_view_own_profile'
      AND cmd = 'SELECT'
  ) THEN
    CREATE POLICY "users_can_view_own_profile"
      ON profiles FOR SELECT
      USING (auth.uid() = id);
  END IF;
END $$;

-- Check if a policy exists for UPDATE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'users_can_update_own_profile'
      AND cmd = 'UPDATE'
  ) THEN
    CREATE POLICY "users_can_update_own_profile"
      ON profiles FOR UPDATE
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Step 7: Check if handle_new_user function exists
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND routine_name = 'handle_new_user';

-- Step 8: Create or update handle_new_user function to include loyalty fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, points_balance, total_purchases)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Check if trigger exists on auth.users
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth' 
  AND event_object_table = 'users'
  AND trigger_name LIKE '%profile%';

-- Step 10: Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'auth'
      AND event_object_table = 'users'
      AND trigger_name = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

-- Step 11: Final verification - Check table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 12: Test query - Check existing profiles
SELECT 
  id, 
  username, 
  points_balance, 
  total_purchases, 
  created_at
FROM profiles
LIMIT 5;

