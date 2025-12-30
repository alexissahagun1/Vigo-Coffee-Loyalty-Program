# Fix webServiceURL Configuration Issue

## 🔍 Problem Identified

The pass has `webServiceURL` set to:
```
https://vigo-loyalty.vercel.app/api/pass
```

But your actual production URL is:
```
https://vigo-loyalty.vercel.app
```

**This mismatch prevents Apple from reaching your registration/update endpoints!**

## ✅ Solution

### Option 1: Remove NEXT_PUBLIC_APP_URL (Recommended)

Let Vercel automatically use the correct URL:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. **Delete** the `NEXT_PUBLIC_APP_URL` variable (or set it to empty)
3. Vercel will automatically use `VERCEL_URL` which points to the correct production URL
4. **Redeploy** your application

### Option 2: Set NEXT_PUBLIC_APP_URL to Correct URL

If you need to keep `NEXT_PUBLIC_APP_URL` for other reasons:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. **Update** `NEXT_PUBLIC_APP_URL` to: `https://vigo-loyalty.vercel.app`
3. **Redeploy** your application

## 🔄 After Fixing

1. **Re-download the pass** from production:
   - Go to: `https://vigo-loyalty.vercel.app/api/wallet`
   - Download the new pass (it will have the correct `webServiceURL`)
   - Add it to Wallet

2. **Wait 1-2 minutes** for Apple to register the device

3. **Test the update**:
   ```bash
   curl -X POST "https://vigo-loyalty.vercel.app/api/test-update" \
     -H "Content-Type: application/json" \
     -d '{"userId": "4c334e73-8257-4c9c-be06-fb8c761082bc", "pointsToAdd": 1}'
   ```

4. **Check logs** - you should see:
   - `📱 Registration attempt for pass...` (when Apple registers)
   - `📱 PASS UPDATE ENDPOINT CALLED BY APPLE` (when Apple checks for updates)

## 🎯 Why This Matters

The `webServiceURL` in the pass tells Apple where to:
- Register the device (POST to `/api/pass/v1/devices/.../registrations/...`)
- Check for updates (GET `/api/pass/v1/passes/...`)
- List registered passes (GET `/api/pass/v1/devices/.../registrations/...`)

If the URL is wrong, Apple can't reach these endpoints, so:
- ❌ Device never gets registered
- ❌ Pass never updates automatically
- ❌ Push notifications can't be sent

## ✅ Verification

After fixing, verify the URL is correct:

```bash
curl -s "https://vigo-loyalty.vercel.app/api/test-registration?userId=test" | jq '.webServiceURL'
```

Should return:
```
"https://vigo-loyalty.vercel.app/api/pass"
```

Not:
```
"https://vigo-loyalty.vercel.app/api/pass"
```

