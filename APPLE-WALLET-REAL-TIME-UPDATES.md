# Apple Wallet Real-Time Updates - Complete Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Environment Variables](#environment-variables)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)
6. [How It Works](#how-it-works)
7. [Testing & Usage](#testing--usage)
8. [Current Status](#current-status)
9. [Troubleshooting](#troubleshooting)
10. [Future Improvements](#future-improvements)

---

## Overview

This project implements **real-time Apple Wallet pass updates** for a loyalty card system. When a user's points balance changes, their Apple Wallet pass updates automatically within seconds via push notifications.

### Key Features
- ✅ **Instant Pass Updates**: Passes update automatically when points change
- ✅ **Push Notifications**: Uses APNs (Apple Push Notification Service) for immediate updates
- ✅ **Dynamic Tiger Display**: Shows red/white tigers based on points (0-9 red tigers, cycles every 10 points)
- ✅ **Reward System**: Coffee rewards at 10, 20, 30... points; Meal rewards at 25, 50, 75... points
- ✅ **Anonymous Authentication**: Users can join without creating accounts
- ✅ **Production Ready**: Fully deployed on Vercel with all endpoints working

---

## Architecture

### Flow Diagram

```
User Purchase/Update
    ↓
API Endpoint (/api/purchase or /api/test-update)
    ↓
Update Database (points_balance)
    ↓
Send Push Notification via APNs
    ↓
Apple Notifies Device
    ↓
Device Fetches Updated Pass
    ↓
Pass Updates in Wallet (instant!)
```

### Components

1. **Pass Generation** (`/api/wallet`)
   - Generates `.pkpass` file with `webServiceURL` and `authenticationToken`
   - Creates dynamic background with tiger images based on points

2. **Pass Update Endpoints** (`/api/pass/v1/...`)
   - Device registration/unregistration
   - Pass fetching (when Apple requests updates)
   - Serial number listing

3. **Push Notifications** (`lib/passkit/push-notifications.ts`)
   - Sends APNs notifications to registered devices
   - Triggers immediate pass updates

4. **Authentication** (`lib/passkit/auth-token.ts`)
   - Generates deterministic auth tokens for Apple
   - Validates tokens on update requests

---

## Environment Variables

### Required for Production (Vercel)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # Critical for API routes

# Apple PassKit
PASS_TYPE_ID=pass.com.vigocoffee.loyalty
APPLE_TEAM_ID=your-team-id
APPLE_PASS_CERT_BASE64=base64-encoded-certificate
APPLE_PASS_KEY_BASE64=base64-encoded-key
APPLE_PASS_PASSWORD=your-certificate-password
APPLE_WWDR_CERT_BASE64=base64-encoded-wwdr-certificate

# APNs (Apple Push Notification Service)
APNS_KEY_ID=your-apns-key-id
APNS_TEAM_ID=your-team-id  # Same as APPLE_TEAM_ID
APNS_KEY_BASE64=base64-encoded-p8-key-file
APNS_PRODUCTION=true  # true for production, false for sandbox

# Pass Authentication
PASS_AUTH_SECRET=your-random-secret-key  # Generate a secure random string

# Application URL
NEXT_PUBLIC_APP_URL=https://vigo-loyalty.vercel.app
```

### How to Get Each Value

1. **PASS_AUTH_SECRET**: Generate a random string (e.g., `openssl rand -hex 32`)
2. **APNS_KEY_BASE64**: 
   - Download `.p8` key from Apple Developer Portal
   - Encode: `base64 -i AuthKey_XXXXXXXXXX.p8`
3. **Apple Certificates**: Export from Keychain, encode as Base64
4. **SUPABASE_SERVICE_ROLE_KEY**: From Supabase Dashboard → Settings → API

---

## API Endpoints

### 1. Generate/Download Pass
**GET** `/api/wallet`

Generates and downloads the Apple Wallet pass for the current user.

**Response**: `.pkpass` file (downloads automatically)

**Notes**:
- Requires user authentication (anonymous or logged in)
- Sets `webServiceURL` and `authenticationToken` for automatic updates
- Generates dynamic background with tiger images

---

### 2. Purchase Endpoint
**POST** `/api/purchase`

Records a purchase and updates points. Used in production for actual purchases.

**Request Body**:
```json
{
  "customerId": "user-uuid",
  "userId": "user-uuid"  // Alternative field name
}
```

**Response**:
```json
{
  "success": true,
  "customer": {
    "id": "user-uuid",
    "name": "Customer Name",
    "total_purchases": 5,
    "points_balance": 5
  },
  "pointsEarned": 1,
  "rewardEarned": false,
  "rewardType": null,
  "message": "Purchase recorded! Customer Name New balance: 5 points"
}
```

**Features**:
- Adds 1 point per purchase
- Checks for rewards (coffee at 10, 20, 30... / meal at 25, 50, 75...)
- Sends push notification automatically
- Uses service role client to bypass RLS

---

### 3. Test Update Endpoint
**POST** `/api/test-update`

Test endpoint to manually update points and trigger push notifications. Useful for testing.

**Request Body**:
```json
{
  "userId": "user-uuid",
  "points": 1  // Can be negative to subtract points
}
```

**Examples**:
```bash
# Add 1 point
curl -X POST https://vigo-loyalty.vercel.app/api/test-update \
  -H "Content-Type: application/json" \
  -d '{"userId":"2663229d-8983-47ae-93d7-59df88c7b55c","points":1}'

# Subtract 1 point
curl -X POST https://vigo-loyalty.vercel.app/api/test-update \
  -H "Content-Type: application/json" \
  -d '{"userId":"2663229d-8983-47ae-93d7-59df88c7b55c","points":-1}'

# Add 5 points
curl -X POST https://vigo-loyalty.vercel.app/api/test-update \
  -H "Content-Type: application/json" \
  -d '{"userId":"2663229d-8983-47ae-93d7-59df88c7b55c","points":5}'
```

**Response**:
```json
{
  "success": true,
  "userId": "user-uuid",
  "oldPoints": 6,
  "newPoints": 7,
  "pointsAdded": 1,
  "devicesNotified": 1,
  "message": "Points updated! New balance: 7. Notified 1 device(s)."
}
```

---

### 4. Apple PassKit Endpoints

These are called automatically by Apple's servers:

#### Get Serial Numbers
**GET** `/api/pass/v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}`

Returns list of passes registered to a device. Called when Apple checks for updates.

**Response**:
```json
{
  "serialNumbers": ["user-uuid-1", "user-uuid-2"],
  "lastUpdated": "2025-12-24T20:47:40.000Z"  // Required for "What changed?" requests
}
```

#### Register Device
**POST** `/api/pass/v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}`

Registers a pass with a device. Called when user adds pass to Wallet.

**Request Body**: Push token (plain text)

**Response**: `201 Created`

#### Unregister Device
**DELETE** `/api/pass/v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}`

Unregisters a pass. Called when user removes pass from Wallet.

**Response**: `200 OK`

#### Get Updated Pass
**GET** `/api/pass/v1/passes/{passTypeIdentifier}/{serialNumber}`

Returns the latest version of a pass. Called when Apple fetches updates.

**Headers**:
- `Authorization: ApplePass {token}`
- `If-Modified-Since: {timestamp}` (optional)

**Response**: `.pkpass` file or `304 Not Modified`

#### Error Logging
**POST** `/api/pass/v1/log`

Receives error logs from Apple Wallet. Used for debugging.

---

### 5. Test Registration Endpoint
**GET** `/api/test-registration?userId={userId}`

Diagnostic endpoint to check registration status.

**Response**:
```json
{
  "success": true,
  "webServiceURL": "https://vigo-loyalty.vercel.app/api/pass",
  "totalRegistrations": 1,
  "userRegistrations": 1,
  "registrations": [...]
}
```

---

## Database Schema

### `profiles` Table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  points_balance INTEGER DEFAULT 0,
  total_purchases INTEGER DEFAULT 0
);
```

### `pass_registrations` Table
```sql
CREATE TABLE pass_registrations (
  device_library_identifier TEXT NOT NULL,
  pass_type_identifier TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  push_token TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (device_library_identifier, pass_type_identifier, serial_number)
);
```

**Migration**: See `supabase-pass-registrations.sql`

---

## How It Works

### 1. Initial Pass Download
1. User visits `/join` page
2. Enters name (or uses anonymous auth)
3. Clicks "Add to Apple Wallet"
4. Pass is generated with:
   - `webServiceURL`: Points to `/api/pass`
   - `authenticationToken`: Deterministic token based on user ID
5. User adds pass to Wallet
6. Apple automatically calls registration endpoint
7. Device and push token stored in `pass_registrations` table

### 2. Real-Time Updates
1. Points change (via `/api/purchase` or `/api/test-update`)
2. Database updated with new `points_balance`
3. `notifyPassUpdate()` called
4. Function fetches all registered devices for that user
5. Sends APNs push notification to each device
6. Apple receives notification
7. Apple fetches updated pass from `/api/pass/v1/passes/...`
8. Pass regenerated with new points and tiger images
9. Wallet updates automatically (instant!)

### 3. Tiger Display Logic
- **0-9 points**: Shows 0-9 red tigers respectively
- **10, 20, 30... points**: Shows 10 red tigers (full grid)
- **11, 21, 31... points**: Shows 1 red tiger (new cycle starts)
- **White tigers**: Fill remaining grid slots (10 total slots)

**Implementation**: `lib/loyalty-card/generate-background.ts`

---

## Testing & Usage

### Test Pass Update
```bash
curl -X POST https://vigo-loyalty.vercel.app/api/test-update \
  -H "Content-Type: application/json" \
  -d '{"userId":"YOUR-USER-ID","points":1}'
```

### Test Purchase
```bash
curl -X POST https://vigo-loyalty.vercel.app/api/purchase \
  -H "Content-Type: application/json" \
  -d '{"customerId":"YOUR-USER-ID"}'
```

### Check Registration Status
```bash
curl "https://vigo-loyalty.vercel.app/api/test-registration?userId=YOUR-USER-ID"
```

### Manual Database Update (Not Recommended)
If you update points directly in the database:
- ❌ **No push notification sent**
- ⏳ **Update only happens when Apple checks periodically (5-15 min)**
- ✅ **Use `/api/test-update` instead for instant updates**

---

## Current Status

### ✅ Working Features
- [x] Pass generation with dynamic tiger images
- [x] Real-time pass updates via push notifications
- [x] Device registration/unregistration
- [x] Authentication token system
- [x] Purchase endpoint with reward detection
- [x] Test update endpoint (add/subtract points)
- [x] Service role client for RLS bypass
- [x] APNs push notifications configured
- [x] All PassKit endpoints implemented
- [x] Error logging from Apple

### ⚠️ Known Issues (Non-Critical)
- [ ] `lastUpdated` field warning in logs (fix deployed, may need cache clear)
- [ ] Fontconfig warning (cosmetic, doesn't affect functionality)

### 🔧 Recent Fixes
1. **Serial Numbers Response Format**: Changed from array to `{ serialNumbers: [...] }`
2. **lastUpdated Field**: Added to "What changed?" responses
3. **Service Role Client**: Implemented to bypass RLS in API routes
4. **Deterministic Auth Tokens**: Fixed to be consistent (no timestamp)

---

## Troubleshooting

### Pass Not Updating
1. **Check registration**: Use `/api/test-registration?userId=...`
2. **Check push notifications**: Verify APNs environment variables
3. **Check logs**: Look for errors in Vercel logs
4. **Manual refresh**: Pull down on pass in Wallet to force update

### "User not found" Error
- **Cause**: RLS blocking access
- **Fix**: Ensure using `createServiceRoleClient()` in API routes

### "Malformed response" Error
- **Cause**: Returning array instead of dictionary
- **Fix**: Already fixed - ensure latest code is deployed

### Push Notifications Not Working
1. Verify APNs environment variables are set
2. Check `pass_registrations` table has `push_token` values
3. Verify APNs key is valid and not expired
4. Check Vercel logs for APNs errors

### Pass Shows Wrong Balance
1. Verify database has correct `points_balance`
2. Check if pass needs manual refresh (pull down in Wallet)
3. Verify pass was downloaded from production URL (not localhost)

---

## Future Improvements

### Potential Enhancements
1. **Database Triggers**: Auto-trigger push notifications on direct DB updates
2. **Webhook Support**: Allow external systems to trigger updates
3. **Batch Updates**: Update multiple users at once
4. **Update History**: Track when passes were last updated
5. **Better Error Handling**: More detailed error messages
6. **Rate Limiting**: Prevent abuse of test endpoints
7. **Analytics**: Track update success rates
8. **Retry Logic**: Retry failed push notifications

### Code Quality
- [ ] Add input validation for negative balances
- [ ] Add rate limiting to test endpoints
- [ ] Improve error messages
- [ ] Add unit tests
- [ ] Add integration tests

---

## Key Files Reference

### Core Files
- `app/api/wallet/route.ts` - Pass generation
- `app/api/purchase/route.ts` - Purchase endpoint
- `app/api/test-update/route.ts` - Test update endpoint
- `lib/passkit/push-notifications.ts` - APNs push notifications
- `lib/passkit/auth-token.ts` - Authentication tokens
- `lib/loyalty-card/generate-background.ts` - Tiger grid logic

### PassKit Endpoints
- `app/api/pass/v1/devices/[deviceLibraryIdentifier]/registrations/[passTypeIdentifier]/route.ts` - Get serial numbers
- `app/api/pass/v1/devices/[deviceLibraryIdentifier]/registrations/[passTypeIdentifier]/[serialNumber]/route.ts` - Register/unregister
- `app/api/pass/v1/passes/[passTypeIdentifier]/[serialNumber]/route.ts` - Get updated pass
- `app/api/pass/v1/log/route.ts` - Error logging

### Database
- `supabase-pass-registrations.sql` - Registration table migration
- `lib/supabase/server.ts` - Supabase clients (including service role)

---

## Quick Reference

### Test User ID
Current test user: `2663229d-8983-47ae-93d7-59df88c7b55c`

### Production URL
`https://vigo-loyalty.vercel.app`

### Key Commands
```bash
# Add 1 point
curl -X POST https://vigo-loyalty.vercel.app/api/test-update \
  -H "Content-Type: application/json" \
  -d '{"userId":"2663229d-8983-47ae-93d7-59df88c7b55c","points":1}'

# Subtract 1 point
curl -X POST https://vigo-loyalty.vercel.app/api/test-update \
  -H "Content-Type: application/json" \
  -d '{"userId":"2663229d-8983-47ae-93d7-59df88c7b55c","points":-1}'

# Check registrations
curl "https://vigo-loyalty.vercel.app/api/test-registration?userId=2663229d-8983-47ae-93d7-59df88c7b55c"
```

---

## Support

For issues or questions:
1. Check Vercel logs for errors
2. Use `/api/test-registration` to diagnose registration issues
3. Verify all environment variables are set correctly
4. Check Apple Wallet error logs (sent to `/api/pass/v1/log`)

---

**Last Updated**: December 24, 2025
**Status**: ✅ Production Ready - All Features Working


