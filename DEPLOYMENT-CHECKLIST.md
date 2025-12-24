# Vigo Loyalty Program - Deployment Checklist

## ✅ What's Been Done

1. **Database Setup Script Created** (`supabase-setup.sql`)
   - Adds `points_balance` and `total_purchases` columns to profiles table
   - Sets up RLS policies
   - Creates auto-profile creation trigger
   - Updates existing profiles with default values

2. **Wallet Route Fixed** (`app/api/wallet/route.ts`)
   - Added error handling for missing profiles (auto-creates if needed)
   - Fixed certificate key handling (supports separate key or combined cert)
   - Added environment variable validation
   - Fixed TypeScript linting errors

3. **Verification Guide Created** (`PROJECT-VERIFICATION.md`)
   - Step-by-step instructions for verifying your Supabase setup
   - Quick verification queries

## 📋 Next Steps - Action Required

### Step 1: Run Database Setup in Your Supabase Project

1. Go to your Supabase dashboard: [https://supabase.com/dashboard/project/oraffmhquiafblhtkldx](https://supabase.com/dashboard/project/oraffmhquiafblhtkldx)
2. Navigate to **SQL Editor**
3. Open the file `supabase-setup.sql` from this project
4. Copy and paste the entire contents into the SQL Editor
5. Click **Run** to execute
6. Verify all steps completed successfully (check the output)

### Step 2: Verify Your Database Schema

Run this quick check in SQL Editor:

```sql
SELECT 
  column_name, 
  data_type, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('points_balance', 'total_purchases');
```

**Expected Result:** Should return 2 rows showing both columns exist with default value `0`

### Step 3: Get Your Supabase API Credentials

1. In Supabase dashboard, go to **Project Settings** → **API**
2. Copy these values:
   - **Project URL:** `https://oraffmhquiafblhtkldx.supabase.co`
   - **anon/public key:** (for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)

### Step 4: Set Up Apple Pass Certificates

**Prerequisites:**
- Apple Developer Account ($99/year)
- Pass Type ID created in Apple Developer Portal

**Steps:**
1. Create Pass Type ID: `pass.com.yourcoffeeshop.loyalty`
2. Generate Pass Certificate
3. Convert to Base64 (see instructions below)

**Convert Certificates to Base64:**

```bash
# Extract certificate from .p12
openssl pkcs12 -in certificate.p12 -clcerts -nokeys -out cert.pem
openssl pkcs12 -in certificate.p12 -nocerts -nodes -out key.pem

# Download WWDR certificate
curl -O https://www.apple.com/certificateauthority/AppleWWDRCAG3.cer
openssl x509 -inform DER -in AppleWWDRCAG3.cer -out wwdr.pem

# Convert to Base64
base64 -i cert.pem | pbcopy  # → APPLE_PASS_CERT_BASE64
base64 -i key.pem | pbcopy   # → APPLE_PASS_KEY_BASE64
base64 -i wwdr.pem | pbcopy  # → APPLE_WWDR_CERT_BASE64
```

### Step 5: Create `.env.local` File

Create `.env.local` in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://oraffmhquiafblhtkldx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key_from_supabase

# Apple Pass Certificates (Base64 encoded)
APPLE_PASS_CERT_BASE64=your_certificate_base64_here
APPLE_PASS_KEY_BASE64=your_key_base64_here
APPLE_WWDR_CERT_BASE64=your_wwdr_certificate_base64_here
APPLE_PASS_PASSWORD=your_p12_password_if_any
```

### Step 6: Test Locally

```bash
# Install dependencies (if not already done)
npm install

# Run development server
npm run dev
```

**Test the wallet endpoint:**
1. Sign up/login at `http://localhost:3000/auth/login`
2. Visit `http://localhost:3000/api/wallet`
3. Should download a `.pkpass` file
4. Open in Apple Wallet on iOS device

### Step 7: Deploy to Vercel

1. **Push to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Add loyalty program setup"
   git push
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Add all environment variables from `.env.local`
   - Deploy

3. **Update Supabase Auth URLs:**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Add your Vercel URL to:
     - Site URL: `https://your-app.vercel.app`
     - Redirect URLs: `https://your-app.vercel.app/auth/callback`

## 🔍 Verification Queries

Run these in your Supabase SQL Editor to verify everything:

### Check Table Structure
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;
```

### Check RLS Policies
```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';
```

### Check Trigger
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'auth' AND trigger_name = 'on_auth_user_created';
```

### Test Profile Creation
```sql
SELECT id, username, points_balance, total_purchases
FROM profiles
LIMIT 5;
```

## 🐛 Troubleshooting

### Issue: "Column points_balance does not exist"
**Solution:** Run `supabase-setup.sql` again in SQL Editor

### Issue: "Unauthorized" when accessing `/api/wallet`
**Solution:** 
- Make sure you're logged in
- Check Supabase auth cookies are set
- Verify `NEXT_PUBLIC_SUPABASE_URL` matches your project

### Issue: "Failed to create profile"
**Solution:**
- Check RLS policies allow INSERT
- Verify the trigger function exists
- Check Supabase logs for detailed error

### Issue: Pass won't open in Wallet
**Solution:**
- Verify certificates are correctly Base64 encoded
- Check Pass Type ID matches in Apple Developer Portal
- Ensure certificates aren't expired
- Verify `APPLE_PASS_PASSWORD` is correct if certificate has password

## 📝 Notes

- The wallet route now auto-creates profiles if they don't exist
- All existing profiles will have `points_balance: 0` and `total_purchases: 0` after running the setup script
- The trigger automatically creates a profile when a new user signs up
- RLS policies ensure users can only view/update their own profile

## 🚀 Next Features to Implement

1. **Purchase Tracking API** - Endpoint to record purchases and update points
2. **Reward Redemption** - Logic to redeem rewards after X purchases
3. **Geofencing** - Location-based notifications (requires PassKit web service)
4. **Merchant Dashboard** - QR code scanner for baristas
5. **Pass Updates** - Push updates to Wallet when points change

---

**Project URL:** `https://oraffmhquiafblhtkldx.supabase.co`  
**Status:** ✅ Database setup script ready, code fixes applied  
**Next:** Run `supabase-setup.sql` in your Supabase dashboard

