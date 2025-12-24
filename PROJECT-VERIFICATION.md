# Vigo Loyalty Program - Project Verification Guide

## Your Supabase Project
**Project URL:** `https://oraffmhquiafblhtkldx.supabase.co`

## Step-by-Step Verification

### 1. Access Your Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: `oraffmhquiafblhtkldx`
3. Navigate to the SQL Editor

### 2. Run the Setup Script
1. Open the SQL Editor in your Supabase dashboard
2. Copy and paste the contents of `supabase-setup.sql`
3. Click "Run" to execute the script
4. Review the results to ensure all steps completed successfully

### 3. Verify Database Schema

Run this query to verify your profiles table structure:

```sql
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;
```

**Expected columns:**
- `id` (uuid, NOT NULL)
- `username` (text, nullable)
- `full_name` (text, nullable)
- `avatar_url` (text, nullable)
- `created_at` (timestamptz, NOT NULL)
- `updated_at` (timestamptz, NOT NULL)
- `points_balance` (integer, NOT NULL, default: 0) ✅ **NEW**
- `total_purchases` (integer, NOT NULL, default: 0) ✅ **NEW**

### 4. Verify RLS Policies

Run this query to check Row Level Security:

```sql
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';
```

**Expected policies:**
- `users_can_view_own_profile` (SELECT) - Users can view their own profile
- `users_can_update_own_profile` (UPDATE) - Users can update their own profile
- Any existing policies from your other tables

### 5. Verify Auto-Create Profile Trigger

Check if the trigger exists:

```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'auth' 
  AND event_object_table = 'users'
  AND trigger_name = 'on_auth_user_created';
```

**Expected:** Should return one row with trigger `on_auth_user_created`

### 6. Get Your API Credentials

1. Go to **Project Settings** → **API**
2. Copy these values for your `.env.local`:
   - **Project URL:** `https://oraffmhquiafblhtkldx.supabase.co`
   - **anon/public key:** (Use this for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)

### 7. Test the Setup

After running the setup script, test with a sample query:

```sql
-- Check if existing profiles have the new columns
SELECT 
  id, 
  username, 
  points_balance, 
  total_purchases,
  created_at
FROM profiles
LIMIT 5;
```

All existing profiles should show `points_balance: 0` and `total_purchases: 0`.

### 8. Environment Variables Checklist

Make sure your `.env.local` file has:

```env
NEXT_PUBLIC_SUPABASE_URL=https://oraffmhquiafblhtkldx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here

# Apple Pass Certificates (Base64 encoded)
APPLE_PASS_CERT_BASE64=your_certificate_base64
APPLE_PASS_KEY_BASE64=your_key_base64  # If separate from cert
APPLE_WWDR_CERT_BASE64=your_wwdr_certificate_base64
APPLE_PASS_PASSWORD=your_p12_password  # If certificate has password
```

### 9. Common Issues & Solutions

#### Issue: "Column points_balance does not exist"
**Solution:** Run the setup script again, specifically Step 2

#### Issue: "Policy already exists"
**Solution:** This is fine - the script uses `DO $$` blocks to check before creating

#### Issue: "Trigger already exists"
**Solution:** This is fine - the script checks before creating the trigger

#### Issue: Existing profiles don't have points_balance
**Solution:** Step 3 of the script updates existing profiles. If it didn't work, run:
```sql
UPDATE profiles 
SET points_balance = 0, total_purchases = 0
WHERE points_balance IS NULL OR total_purchases IS NULL;
```

### 10. Next Steps After Verification

1. ✅ Database schema is ready
2. ⏳ Set up Apple Pass certificates (see deployment guide)
3. ⏳ Configure environment variables
4. ⏳ Test the `/api/wallet` endpoint locally
5. ⏳ Deploy to Vercel

## Quick Verification Command

Run this single query to see everything at once:

```sql
SELECT 
  'profiles table exists' as check_item,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) as status
UNION ALL
SELECT 
  'points_balance column exists',
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'points_balance'
  )
UNION ALL
SELECT 
  'total_purchases column exists',
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'total_purchases'
  )
UNION ALL
SELECT 
  'RLS enabled on profiles',
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles'
UNION ALL
SELECT 
  'handle_new_user function exists',
  EXISTS (
    SELECT 1 FROM information_schema.routines
    WHERE routine_schema = 'public' 
      AND routine_name = 'handle_new_user'
  )
UNION ALL
SELECT 
  'on_auth_user_created trigger exists',
  EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_schema = 'auth'
      AND event_object_table = 'users'
      AND trigger_name = 'on_auth_user_created'
  );
```

All status values should be `true` ✅

