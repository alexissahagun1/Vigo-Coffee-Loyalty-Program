# Environment Variables Template

Copy this to your `.env.local` file in the root of your Next.js project:

```env
# Supabase Configuration
# Get these values from your Supabase project settings: https://app.supabase.com/project/_/settings/api

# Public URL of your Supabase project
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url

# Anon/Public key (safe to expose in client-side code)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key

# Service Role Key (KEEP SECRET - server-side only, bypasses RLS)
# NEVER commit this to version control or expose it in client-side code
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application URL (used for generating invitation links)
# For local development: http://localhost:3000
# For production: https://your-domain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## How to Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to **Settings** → **API**
3. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

## Security Notes

- The `SUPABASE_SERVICE_ROLE_KEY` bypasses all Row Level Security policies
- Never commit this key to version control
- Never expose it in client-side code
- Only use it in server-side API routes

