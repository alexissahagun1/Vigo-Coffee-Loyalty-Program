# Apple Wallet Settings: Automatic Updates & Notifications

## ✅ Current Status

### Automatic Updates - **ENABLED** ✅
Your pass already has this feature! The "Automatic Updates" toggle will appear automatically in Wallet settings because:

1. ✅ `webServiceURL` is configured in pass generation
2. ✅ `authenticationToken` is set
3. ✅ Pass update endpoints are implemented
4. ✅ Database migration for registrations is complete

**What this means:**
- Users will see the "Automatic Updates" toggle in Wallet pass settings
- Apple will periodically check your server for pass updates
- Passes will update automatically when points change (usually within 5-15 minutes)

### Allow Notifications - **REQUIRES SETUP** ⏳
The "Allow Notifications" toggle will appear once push notifications are configured. This requires:

1. ⏳ APNs (Apple Push Notification Service) certificate
2. ⏳ Push notification library installation
3. ⏳ Integration with purchase endpoint

**What this means:**
- Users will see the "Allow Notifications" toggle once APNs is set up
- Passes will update instantly when points change (instead of waiting 5-15 minutes)
- Users get notified immediately when they earn rewards

## 🎯 How These Settings Work

### Automatic Updates (Already Working)
```
User adds pass → Apple registers with your server
Points update → Apple checks periodically (5-15 min intervals)
Pass updates → User sees new points automatically
```

### Allow Notifications (Needs APNs Setup)
```
User adds pass → Apple registers with push token
Points update → Your server sends push notification
Apple notifies device → Device fetches update immediately
Pass updates → User sees new points instantly + notification
```

## 📱 What Users See

When users open their pass in Wallet and tap the "..." button, they'll see:

1. **Automatic Updates** toggle (already available)
   - When ON: Pass updates automatically when points change
   - When OFF: Pass only updates when manually refreshed

2. **Allow Notifications** toggle (appears after APNs setup)
   - When ON: User gets push notifications when pass updates
   - When OFF: Pass updates silently in background

## 🚀 To Enable Notifications

### Step 1: Get APNs Certificate
1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list)
2. Navigate to Certificates, Identifiers & Profiles
3. Create a new APNs certificate for your Pass Type ID
4. Download the certificate (.p12 file)

### Step 2: Install Push Notification Library
```bash
npm install node-apn
```

### Step 3: Configure Environment Variables
```env
APNS_KEY_ID=your_key_id
APNS_TEAM_ID=your_team_id
APNS_KEY_PATH=path/to/AuthKey_XXXXX.p8
APNS_BUNDLE_ID=pass.com.vigocoffee.loyalty
APNS_PRODUCTION=true  # false for sandbox
```

### Step 4: Create Push Notification Service
See `lib/passkit/push-notifications.ts` (to be created)

### Step 5: Integrate with Purchase Endpoint
Update `/api/purchase` to send push notifications after points update

## 💡 Important Notes

1. **User Control**: These are user-controlled toggles - we can't force them to be ON
2. **Automatic Appearance**: The toggles appear automatically when the pass supports these features
3. **Production Only**: Web service URL only works in production (not localhost)
4. **Update Frequency**: 
   - Automatic Updates: 5-15 minutes (periodic checks)
   - Push Notifications: Instant (when configured)

## ✅ What's Already Done

- ✅ Web service URL configured
- ✅ Authentication token system
- ✅ Pass update endpoints
- ✅ Device registration system
- ✅ Database table for registrations
- ✅ Automatic Updates toggle will appear automatically

## ⏳ What's Needed for Notifications

- ⏳ APNs certificate setup
- ⏳ Push notification service implementation
- ⏳ Integration with purchase endpoint


