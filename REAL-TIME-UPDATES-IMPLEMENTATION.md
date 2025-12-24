# Real-Time Apple Wallet Pass Updates - Implementation Summary

## ✅ Testing Results

### Tiger Grid Logic - VERIFIED ✅
All tests passed successfully:
- ✅ Points 0-9: Correctly displays 0-9 red tigers
- ✅ Points 10, 20, 30...: Shows 10 red tigers (full grid)
- ✅ Points 11, 21, 31...: Shows 1 red tiger (new cycle starts)
- ✅ Proper cycling every 10 points
- ✅ Coffee rewards at 10, 20, 30... points
- ✅ Meal rewards at 25, 50, 75... points

### Purchase Flow - VERIFIED ✅
End-to-end testing confirms:
- ✅ Points increment correctly with each purchase
- ✅ Tiger grid updates reflect current points
- ✅ Rewards trigger at correct milestones
- ✅ Cycle resets properly after 10 points

## 🚀 Real-Time Updates Implementation

### What Was Implemented

1. **Web Service URL Configuration**
   - Added `webServiceURL` to pass generation
   - Added `authenticationToken` for secure updates
   - Configured in both `/api/wallet` and `/api/pass/v1/passes/...` endpoints

2. **Pass Update API Endpoints**
   Created the following endpoints required by Apple:
   - `GET /api/pass/v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}`
     - Returns list of passes registered to a device
   - `POST /api/pass/v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}`
     - Registers a pass with a device (when user adds to Wallet)
   - `DELETE /api/pass/v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}`
     - Unregisters a pass (when user removes from Wallet)
   - `GET /api/pass/v1/passes/{passTypeIdentifier}/{serialNumber}`
     - Returns latest pass version with current points
   - `POST /api/pass/v1/log`
     - Receives error logs from Apple

3. **Authentication Token System**
   - Created `lib/passkit/auth-token.ts`
   - Generates secure tokens for pass authentication
   - Validates tokens on update requests

4. **Database Schema**
   - Created `supabase-pass-registrations.sql` migration
   - Stores device registrations for push notifications
   - Tracks push tokens for APNs notifications

## 📋 Next Steps to Complete Real-Time Updates

### 1. Run Database Migration
Execute `supabase-pass-registrations.sql` in your Supabase SQL Editor to create the `pass_registrations` table.

### 2. Set Environment Variables
Add to your `.env.local` (and production):
```env
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app  # Your production URL
PASS_AUTH_SECRET=your-secret-key-here  # Secret for token generation
```

### 3. Test Pass Registration
1. Deploy to production (web service URL only works in production, not localhost)
2. Download a pass to an iOS device
3. Check Supabase logs to see registration requests
4. Verify `pass_registrations` table has entries

### 4. Implement Push Notifications (Optional but Recommended)
To enable automatic updates when points change:

1. **Set up APNs (Apple Push Notification Service)**
   - Get APNs certificate from Apple Developer Portal
   - Configure push notification service

2. **Update Purchase Endpoint**
   - After updating points, query `pass_registrations` table
   - Send push notification to registered devices
   - Apple will then fetch latest pass version

3. **Push Notification Library**
   - Install: `npm install node-apn` or similar
   - Create push notification service
   - Integrate with purchase endpoint

### 5. Manual Testing Checklist

- [ ] Deploy to production
- [ ] Download pass to iOS device
- [ ] Verify pass appears in Wallet
- [ ] Make a purchase via `/api/purchase`
- [ ] Wait for Apple to check for updates (can take a few minutes)
- [ ] Verify pass updates automatically in Wallet
- [ ] Check Supabase logs for API calls from Apple
- [ ] Test with multiple devices

## 🔍 How It Works

1. **User Downloads Pass**
   - Pass includes `webServiceURL` and `authenticationToken`
   - Apple registers the pass with your server

2. **Points Update**
   - Purchase is made via `/api/purchase`
   - Points updated in database
   - (Optional) Push notification sent to device

3. **Apple Checks for Updates**
   - Apple periodically checks `webServiceURL` for updates
   - Calls `GET /api/pass/v1/passes/...` with authentication token
   - Server returns latest pass with current points

4. **Pass Updates in Wallet**
   - Apple downloads new pass version
   - Wallet automatically updates the pass
   - User sees new tiger grid and points

## ⚠️ Important Notes

1. **Localhost Limitation**
   - Web service URL only works in production
   - Apple's servers cannot reach `localhost:3000`
   - Must deploy to test real-time updates

2. **Update Frequency**
   - Apple checks for updates periodically (not instant)
   - Updates can take 5-15 minutes to appear
   - Push notifications make updates faster (near-instant)

3. **Authentication**
   - Current implementation uses simple token validation
   - In production, consider using JWT or more secure method
   - Tokens are validated on every update request

4. **Error Handling**
   - All endpoints return appropriate status codes
   - Errors are logged for debugging
   - Apple expects specific response formats

## 📊 Current Status

- ✅ Tiger grid logic: **WORKING**
- ✅ Purchase flow: **WORKING**
- ✅ Pass generation: **WORKING**
- ✅ Web service URL: **CONFIGURED** (needs production deployment)
- ✅ Update endpoints: **IMPLEMENTED** (needs testing)
- ⏳ Push notifications: **NOT IMPLEMENTED** (optional)
- ⏳ Database migration: **READY** (needs execution)

## 🐛 Troubleshooting

### Pass doesn't update automatically
- Check if `NEXT_PUBLIC_APP_URL` is set correctly
- Verify pass was downloaded in production (not localhost)
- Check Supabase logs for Apple's API calls
- Verify `pass_registrations` table has entries

### Registration fails
- Check if `pass_registrations` table exists
- Verify RLS policies allow inserts
- Check authentication token is being sent correctly

### Updates are slow
- This is normal - Apple checks periodically
- Implement push notifications for faster updates
- Check server logs for update requests

