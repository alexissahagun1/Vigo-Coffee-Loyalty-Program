# Admin Dashboard Requirements Guide

This guide outlines everything needed for the Admin Dashboard (`/app/admin/page.tsx`) to function properly.

## Table of Contents
1. [Environment Variables](#environment-variables)
2. [Database Schema](#database-schema)
3. [API Routes](#api-routes)
4. [Authentication & Authorization](#authentication--authorization)
5. [Supabase Configuration](#supabase-configuration)
6. [UI Components](#ui-components)
7. [Setup Checklist](#setup-checklist)

---

## Environment Variables

The dashboard requires the following environment variables to be set:

### Required Variables

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application URL (for invitation links)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # or your production URL
```

### Where They're Used

- **NEXT_PUBLIC_SUPABASE_URL** & **NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY**: Used by client-side Supabase client (`lib/supabase/client.ts`) for authentication checks
- **SUPABASE_SERVICE_ROLE_KEY**: Used by server-side API routes (`lib/supabase/server.ts`) to bypass RLS and access all data
- **NEXT_PUBLIC_APP_URL**: Used to generate invitation URLs in `/api/admin/create-invitation`

---

## Database Schema

The dashboard requires three main database tables:

### 1. `employees` Table

Required columns:
- `id` (uuid, PRIMARY KEY) - References `auth.users.id`
- `email` (text, NOT NULL, UNIQUE)
- `username` (text, NOT NULL, UNIQUE)
- `full_name` (text, nullable)
- `is_active` (boolean, NOT NULL, default: true)
- `is_admin` (boolean, NOT NULL, default: false)
- `created_at` (timestamptz, NOT NULL)
- `updated_at` (timestamptz, NOT NULL)

**Indexes recommended:**
- Index on `email` for fast lookups
- Index on `username` for fast lookups
- Index on `is_admin` for filtering admin users

### 2. `employee_invitations` Table

Required columns:
- `id` (uuid, PRIMARY KEY)
- `email` (text, NOT NULL)
- `token` (text, NOT NULL, UNIQUE) - Secure token for invitation link
- `expires_at` (timestamptz, NOT NULL)
- `used_at` (timestamptz, nullable) - NULL if unused, timestamp when used
- `created_at` (timestamptz, NOT NULL)

**Indexes recommended:**
- Index on `token` for fast validation lookups
- Index on `email` for duplicate checking

### 3. `profiles` Table

Required columns (for customer data):
- `id` (uuid, PRIMARY KEY) - References `auth.users.id`
- `full_name` (text, nullable)
- `email` (text, nullable)
- `points_balance` (integer, NOT NULL, default: 0)
- `total_purchases` (integer, NOT NULL, default: 0)
- `created_at` (timestamptz, NOT NULL)
- `updated_at` (timestamptz, NOT NULL)

**Note:** The `profiles` table is used for customer data, not employees. The dashboard displays customer statistics and lists.

---

## API Routes

The dashboard makes requests to the following API endpoints:

### 1. `/api/admin/stats` (GET)

**Purpose:** Fetch dashboard statistics for the Overview tab

**Returns:**
```json
{
  "success": true,
  "stats": {
    "totalCustomers": number,
    "totalEmployees": number,
    "activeEmployees": number,
    "totalPoints": number,
    "totalPurchases": number,
    "pendingInvitations": number,
    "topCustomers": Array<{
      "id": string,
      "full_name": string | null,
      "points_balance": number,
      "total_purchases": number
    }>
  }
}
```

**Requirements:**
- Uses `createServiceRoleClient()` to bypass RLS
- Queries `profiles` table for customer stats
- Queries `employees` table for employee stats
- Queries `employee_invitations` table for pending invitations

### 2. `/api/admin/employees` (GET, PUT)

**GET - List all employees**
- Returns all employees ordered by `created_at` descending
- Uses `createServiceRoleClient()` to bypass RLS

**PUT - Update employee**
- Updates employee fields: `username`, `full_name`, `is_active`, `is_admin`
- Prevents admins from removing their own admin status
- Prevents admins from deactivating themselves
- Validates username uniqueness
- Uses `createServiceRoleClient()` for updates

**Request Body (PUT):**
```json
{
  "id": "employee-uuid",
  "username": "new_username",
  "full_name": "Full Name",
  "is_active": true,
  "is_admin": false
}
```

### 3. `/api/admin/invitations` (GET)

**Purpose:** List all employee invitations

**Returns:**
```json
{
  "success": true,
  "invitations": Array<{
    "id": string,
    "email": string,
    "token": string,
    "expires_at": string,
    "used_at": string | null,
    "created_at": string
  }>
}
```

**Requirements:**
- Uses `createServiceRoleClient()` to bypass RLS
- Orders by `created_at` descending

### 4. `/api/admin/create-invitation` (POST)

**Purpose:** Create a new employee invitation

**Request Body:**
```json
{
  "email": "employee@example.com"
}
```

**Returns:**
```json
{
  "success": true,
  "invitation": { ... },
  "inviteUrl": "http://localhost:3000/auth/employee/invite/{token}"
}
```

**Requirements:**
- Generates secure token using `crypto.randomBytes(24)`
- Sets expiration to 7 days from creation
- Checks for existing employee with same email
- Uses `NEXT_PUBLIC_APP_URL` for invitation URL

### 5. `/api/admin/customers` (GET)

**Purpose:** List all customers (profiles)

**Returns:**
```json
{
  "success": true,
  "customers": Array<{
    "id": string,
    "full_name": string | null,
    "email": string | null,
    "points_balance": number,
    "total_purchases": number,
    "created_at": string
  }>
}
```

**Requirements:**
- Uses `createServiceRoleClient()` to bypass RLS
- Limits to 100 customers
- Orders by `created_at` descending

---

## Authentication & Authorization

### Access Control Flow

1. **User Authentication Check**
   - Dashboard checks if user is logged in via `supabase.auth.getUser()`
   - If not logged in, redirects to `/auth/employee/login`

2. **Employee Verification**
   - Queries `employees` table to verify user is an employee
   - Checks `is_active` status
   - Checks `is_admin` status

3. **Admin Authorization**
   - Only users with `is_admin = true` AND `is_active = true` can access dashboard
   - Non-admin employees are redirected to `/scan`

### Required Auth Endpoints

- `/api/auth/employee/login` - Employee login endpoint
- `/api/auth/employee/check` - Verify employee status (optional, not directly used by dashboard)

### Security Notes

- **RLS (Row Level Security)**: The dashboard uses `createServiceRoleClient()` which bypasses RLS. This is intentional for admin operations but requires the `SUPABASE_SERVICE_ROLE_KEY` to be kept secure.
- **Client-side checks**: The dashboard performs client-side authorization checks, but all API routes should also verify admin status server-side (currently they rely on service role key).

---

## Supabase Configuration

### Client Setup

**File: `lib/supabase/client.ts`**
- Creates browser client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Used for authentication checks in the dashboard component

**File: `lib/supabase/server.ts`**
- `createClient()`: Creates server client for authenticated requests
- `createServiceRoleClient()`: Creates service role client that bypasses RLS
  - **Critical:** Requires `SUPABASE_SERVICE_ROLE_KEY` environment variable
  - Used by all admin API routes

### Required Functions

The dashboard doesn't require any custom database functions, but the following are used by related features:

- `handle_new_user()` - Auto-creates profile when user signs up (for customers, not employees)

---

## UI Components

The dashboard uses the following UI components from `components/ui/`:

### Required Components

- `Button` - From `components/ui/button.tsx`
- `Input` - From `components/ui/input.tsx`
- `Label` - From `components/ui/label.tsx`
- `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription` - From `components/ui/card.tsx`
- `Badge` - From `components/ui/badge.tsx`

### Dashboard Structure

The dashboard has four main tabs:

1. **Overview Tab** - Displays statistics cards
2. **Employees Tab** - Lists and manages employees
3. **Invitations Tab** - Creates and views employee invitations
4. **Customers Tab** - Lists all customers with their points and purchases

---

## Setup Checklist

### ✅ Environment Setup

- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`
- [ ] Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` (server-side only)
- [ ] Set `NEXT_PUBLIC_APP_URL` in `.env.local` (for invitation links)

### ✅ Database Setup

- [ ] Create `employees` table with all required columns
- [ ] Create `employee_invitations` table with all required columns
- [ ] Ensure `profiles` table has `points_balance` and `total_purchases` columns
- [ ] Create indexes on `employees.email`, `employees.username`, `employee_invitations.token`
- [ ] Set up RLS policies (if needed, though service role bypasses RLS)

### ✅ API Routes

- [ ] Verify `/api/admin/stats` route exists and works
- [ ] Verify `/api/admin/employees` route exists (GET and PUT methods)
- [ ] Verify `/api/admin/invitations` route exists (GET method)
- [ ] Verify `/api/admin/create-invitation` route exists (POST method)
- [ ] Verify `/api/admin/customers` route exists (GET method)

### ✅ Authentication

- [ ] Verify `/api/auth/employee/login` route exists
- [ ] Create at least one admin employee in the database:
  ```sql
  -- Example: Create admin employee (requires existing auth user)
  INSERT INTO employees (id, email, username, full_name, is_active, is_admin)
  VALUES (
    'auth-user-uuid-here',
    'admin@example.com',
    'admin',
    'Admin User',
    true,
    true
  );
  ```

### ✅ UI Components

- [ ] Verify all UI components exist in `components/ui/`
- [ ] Ensure Tailwind CSS is configured properly
- [ ] Test dashboard loads without errors

### ✅ Testing

- [ ] Test admin login flow
- [ ] Test Overview tab loads statistics
- [ ] Test Employees tab lists employees
- [ ] Test creating new invitation
- [ ] Test updating employee (username, status, admin flag)
- [ ] Test Customers tab displays customer list
- [ ] Test non-admin employees are redirected to `/scan`
- [ ] Test unauthenticated users are redirected to login

---

## Common Issues & Solutions

### Issue: "Missing SUPABASE_SERVICE_ROLE_KEY environment variable"

**Solution:** Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in your `.env.local` file. This key is required for all admin API routes.

### Issue: Dashboard shows "Checking access..." indefinitely

**Solution:** 
- Check browser console for errors
- Verify Supabase client is configured correctly
- Ensure user is logged in
- Verify `employees` table exists and has the correct structure

### Issue: "Failed to load statistics" or API errors

**Solution:**
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set correctly
- Check that all required tables exist (`profiles`, `employees`, `employee_invitations`)
- Verify service role key has proper permissions

### Issue: Cannot create invitations

**Solution:**
- Verify `NEXT_PUBLIC_APP_URL` is set correctly
- Check that `employee_invitations` table exists
- Ensure no existing employee has the same email

### Issue: Cannot update employees

**Solution:**
- Verify `employees` table has `updated_at` column
- Check that username is unique (if updating username)
- Ensure you're not trying to remove admin status from your own account

---

## Security Considerations

1. **Service Role Key**: The `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS policies. Keep it secure and never expose it to the client.

2. **Admin Self-Protection**: The dashboard prevents admins from:
   - Removing their own admin status
   - Deactivating their own account
   - These protections are implemented both client-side and server-side

3. **API Route Security**: Consider adding additional server-side admin verification to API routes (currently they rely on service role key access).

4. **Invitation Tokens**: Tokens are generated using `crypto.randomBytes(24)` for security. Tokens expire after 7 days.

---

## Next Steps

After setting up the dashboard:

1. Create your first admin employee account
2. Test all dashboard features
3. Set up employee invitation workflow
4. Configure production environment variables
5. Consider adding audit logging for admin actions
6. Implement additional security measures as needed

---

## Related Files

- Dashboard Component: `app/admin/page.tsx`
- API Routes: `app/api/admin/*`
- Supabase Clients: `lib/supabase/client.ts`, `lib/supabase/server.ts`
- Employee Login: `app/auth/employee/login/page.tsx`, `components/employee-login-form.tsx`
- Database Setup: `supabase-setup.sql`, `supabase-rls-security.sql`


