# Admin Dashboard Setup Guide

This guide will walk you through setting up the Admin Dashboard with all required dependencies, database schema, and configuration.

## 📋 Prerequisites

- Next.js 14+ project
- Supabase account and project
- Node.js 18+ installed
- npm, yarn, or pnpm package manager

## 🚀 Step-by-Step Setup

### Step 1: Install Dependencies

Add the required Supabase packages to your project:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Or with yarn:
```bash
yarn add @supabase/supabase-js @supabase/ssr
```

### Step 2: Set Up Environment Variables

1. Copy the environment template from `ENV_TEMPLATE.md` or create a `.env.local` file in your project root.

2. Get your Supabase credentials:
   - Go to https://app.supabase.com
   - Select your project
   - Navigate to **Settings** → **API**
   - Copy the following values:
     - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
     - **anon public** key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
     - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **Keep this secret!**

3. Set your application URL:
   - For local development: `NEXT_PUBLIC_APP_URL=http://localhost:3000`
   - For production: `NEXT_PUBLIC_APP_URL=https://your-domain.com`

Your `.env.local` should look like:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Set Up Database Schema

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `database/schema.sql` from this dashboard folder
4. Copy and paste the entire SQL script into the SQL Editor
5. Click **Run** to execute the script

This will create:
- `employees` table - for admin and staff accounts
- `employee_invitations` table - for invitation tokens
- `profiles` table - for customer data (or updates existing table)
- Required indexes and triggers
- Row Level Security policies

### Step 4: Copy Files to Your Project

Copy the following files and folders from the `dashboard/` folder to your Next.js project:

#### Required Files Structure:

```
your-project/
├── app/
│   ├── admin/
│   │   └── page.tsx                    # Copy from dashboard/app/admin/page.tsx
│   ├── api/
│   │   └── admin/                      # Copy entire folder from dashboard/app/api/admin/
│   │       ├── stats/
│   │       ├── employees/
│   │       ├── invitations/
│   │       ├── create-invitation/
│   │       └── customers/
│   └── providers.tsx                   # Merge with existing if present
├── src/
│   ├── lib/
│   │   └── supabase/                   # Copy from dashboard/src/lib/supabase/
│   │       ├── client.ts
│   │       └── server.ts
│   └── components/
│       └── admin/                      # Copy from dashboard/src/components/admin/
│           ├── CustomerTable.tsx
│           ├── DashboardHeader.tsx
│           ├── EmployeeTable.tsx
│           ├── EmployeeEditDialog.tsx  # New component
│           ├── InvitationTable.tsx
│           ├── InviteForm.tsx
│           ├── StatCard.tsx
│           └── TopCustomers.tsx
└── public/
    └── assets/                         # Copy from dashboard/public/assets/
```

### Step 5: Update Your Root Layout

Ensure your `app/layout.tsx` includes the Providers component:

```typescript
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {children}
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
```

### Step 6: Create Your First Admin Employee

You need to create at least one admin employee to access the dashboard. You can do this in two ways:

#### Option A: Using Supabase SQL Editor

1. First, create a user in Supabase Auth (or use an existing user)
2. Get the user's UUID from the `auth.users` table
3. Run this SQL in the SQL Editor:

```sql
INSERT INTO employees (id, email, username, full_name, is_active, is_admin)
VALUES (
  'user-uuid-here',           -- Replace with actual auth.users.id
  'admin@example.com',        -- Replace with actual email
  'admin',                    -- Username
  'Admin User',               -- Full name
  true,                       -- is_active
  true                        -- is_admin
);
```

#### Option B: Using Supabase Dashboard

1. Go to **Authentication** → **Users** in Supabase
2. Note the user ID (UUID) of the user you want to make an admin
3. Go to **Table Editor** → **employees**
4. Click **Insert** → **Insert row**
5. Fill in:
   - `id`: The UUID from step 2
   - `email`: User's email
   - `username`: Desired username
   - `full_name`: User's full name (optional)
   - `is_active`: `true`
   - `is_admin`: `true`

### Step 7: Set Up Authentication Routes (Optional)

The dashboard expects authentication routes. If you don't have them yet, you'll need:

- `/auth/employee/login` - Employee login page
- `/scan` - Redirect destination for non-admin employees

You can create these routes or modify the dashboard's redirect logic in `app/admin/page.tsx`.

### Step 8: Test the Dashboard

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `http://localhost:3000/admin`

3. You should see:
   - Authentication check (redirects if not logged in)
   - Dashboard with Overview, Customers, Employees, and Invitations tabs
   - Real data from your Supabase database

## 🔧 Troubleshooting

### Issue: "Missing SUPABASE_SERVICE_ROLE_KEY environment variable"

**Solution:** Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in your `.env.local` file. This key is required for all admin API routes.

### Issue: Dashboard shows "Checking access..." indefinitely

**Solutions:**
- Check browser console for errors
- Verify Supabase client is configured correctly in `src/lib/supabase/client.ts`
- Ensure user is logged in
- Verify `employees` table exists and has the correct structure
- Check that your user exists in the `employees` table with `is_admin = true` and `is_active = true`

### Issue: "Failed to load statistics" or API errors

**Solutions:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check that all required tables exist (`profiles`, `employees`, `employee_invitations`)
- Verify service role key has proper permissions
- Check Supabase project logs for errors

### Issue: Cannot create invitations

**Solutions:**
- Verify `NEXT_PUBLIC_APP_URL` is set correctly
- Check that `employee_invitations` table exists
- Ensure no existing employee has the same email
- Check browser console for error messages

### Issue: Cannot update employees

**Solutions:**
- Verify `employees` table has `updated_at` column (should be created by schema)
- Check that username is unique (if updating username)
- Ensure you're not trying to remove admin status from your own account
- Check API route logs for specific error messages

### Issue: TypeScript errors

**Solutions:**
- Ensure `@supabase/supabase-js` and `@supabase/ssr` are installed
- Check that path aliases in `tsconfig.json` match your project structure
- Verify all imports are using correct paths

## 📝 File Checklist

Use this checklist to ensure all files are in place:

- [ ] `app/admin/page.tsx` - Main dashboard page
- [ ] `app/api/admin/stats/route.ts` - Stats API route
- [ ] `app/api/admin/employees/route.ts` - Employees API route
- [ ] `app/api/admin/invitations/route.ts` - Invitations API route
- [ ] `app/api/admin/create-invitation/route.ts` - Create invitation API route
- [ ] `app/api/admin/customers/route.ts` - Customers API route
- [ ] `src/lib/supabase/client.ts` - Supabase client configuration
- [ ] `src/lib/supabase/server.ts` - Supabase server configuration
- [ ] `src/components/admin/*` - All admin components
- [ ] `.env.local` - Environment variables configured
- [ ] Database schema executed in Supabase
- [ ] At least one admin employee created

## 🔐 Security Notes

1. **Service Role Key**: The `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS policies. Keep it secure and never expose it to the client.

2. **Admin Self-Protection**: The dashboard prevents admins from:
   - Removing their own admin status
   - Deactivating their own account

3. **API Route Security**: Consider adding additional server-side admin verification to API routes (currently they rely on service role key access).

4. **Invitation Tokens**: Tokens are generated using `crypto.randomBytes(24)` for security. Tokens expire after 7 days.

## 📚 Next Steps

After setup:

1. ✅ Test all dashboard features
2. ✅ Create additional admin employees as needed
3. ✅ Set up employee invitation workflow
4. ✅ Configure production environment variables
5. ✅ Consider adding audit logging for admin actions
6. ✅ Implement additional security measures as needed

## 🆘 Getting Help

If you encounter issues:

1. Check the browser console for errors
2. Check Supabase project logs
3. Verify all environment variables are set correctly
4. Ensure database schema is properly set up
5. Review the API route files for any custom modifications needed

---

**Setup Complete!** Your admin dashboard should now be fully functional. 🎉

