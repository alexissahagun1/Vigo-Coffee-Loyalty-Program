# API Testing Commands - Vigo Coffee Loyalty Program

Complete guide for testing all API endpoints using `curl` commands.

## 📋 Table of Contents

1. [Test User ID](#test-user-id)
2. [Scan API](#scan-api)
3. [Purchase API](#purchase-api)
4. [Redeem API](#redeem-api)
5. [Test Update API](#test-update-api)
6. [Complete Test Flows](#complete-test-flows)

---

## Test User ID

**Default test user for all commands:**
```
2663229d-8983-47ae-93d7-59df88c7b55c
```

Replace this ID in all commands with your actual user ID if needed.

---

## Scan API

**Endpoint:** `GET /api/scan`

**Purpose:** Get customer information and available rewards

### Basic Command

```bash
curl "https://vigo-coffee-loyalty-program.vercel.app/api/scan?userId=2663229d-8983-47ae-93d7-59df88c7b55c"
```

### Expected Response

```json
{
  "success": true,
  "customer": {
    "id": "2663229d-8983-47ae-93d7-59df88c7b55c",
    "name": "Alexis prod 4",
    "points": 10,
    "availableRewards": {
      "coffees": [20, 30],
      "meals": [25, 50]
    },
    "redeemedRewards": {
      "coffees": [10],
      "meals": []
    }
  }
}
```

### With Pretty Print (if you have `jq` installed)

```bash
curl "https://vigo-coffee-loyalty-program.vercel.app/api/scan?userId=2663229d-8983-47ae-93d7-59df88c7b55c" | jq
```

---

## Purchase API

**Endpoint:** `POST /api/purchase`

**Purpose:** Record a purchase (adds 1 point to customer)

### Basic Command

```bash
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/purchase \
  -H "Content-Type: application/json" \
  -d '{"customerId":"2663229d-8983-47ae-93d7-59df88c7b55c"}'
```

### Alternative (using userId field)

```bash
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/purchase \
  -H "Content-Type: application/json" \
  -d '{"userId":"2663229d-8983-47ae-93d7-59df88c7b55c"}'
```

### Expected Response

```json
{
  "success": true,
  "customer": {
    "id": "2663229d-8983-47ae-93d7-59df88c7b55c",
    "name": "Customer Name",
    "total_purchases": 6,
    "points_balance": 26
  },
  "pointsEarned": 1,
  "rewardEarned": false,
  "rewardType": null,
  "message": "Purchase recorded! Customer Name New balance: 26 points"
}
```

---

## Redeem API

**Endpoint:** `POST /api/redeem`

**Purpose:** Redeem a reward (marks as redeemed, no point deduction)

### Redeem Coffee Reward

#### Redeem Coffee at 10 points

```bash
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/redeem \
  -H "Content-Type: application/json" \
  -d '{"customerId":"2663229d-8983-47ae-93d7-59df88c7b55c","type":"coffee","points":10}'
```

#### Redeem Coffee at 20 points

```bash
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/redeem \
  -H "Content-Type: application/json" \
  -d '{"customerId":"2663229d-8983-47ae-93d7-59df88c7b55c","type":"coffee","points":20}'
```

#### Redeem Coffee at 30 points

```bash
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/redeem \
  -H "Content-Type: application/json" \
  -d '{"customerId":"2663229d-8983-47ae-93d7-59df88c7b55c","type":"coffee","points":30}'
```

### Redeem Meal Reward

#### Redeem Meal at 25 points

```bash
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/redeem \
  -H "Content-Type: application/json" \
  -d '{"customerId":"2663229d-8983-47ae-93d7-59df88c7b55c","type":"meal","points":25}'
```

#### Redeem Meal at 50 points

```bash
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/redeem \
  -H "Content-Type: application/json" \
  -d '{"customerId":"2663229d-8983-47ae-93d7-59df88c7b55c","type":"meal","points":50}'
```

#### Redeem Meal at 75 points

```bash
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/redeem \
  -H "Content-Type: application/json" \
  -d '{"customerId":"2663229d-8983-47ae-93d7-59df88c7b55c","type":"meal","points":75}'
```

### Expected Response

```json
{
  "success": true,
  "message": "Reward redeemed successfully! meal at 25 points",
  "customer": {
    "id": "2663229d-8983-47ae-93d7-59df88c7b55c",
    "name": "Customer Name",
    "points": 25,
    "redeemedRewards": {
      "coffees": [],
      "meals": [25]
    }
  }
}
```

---

## Test Update API

**Endpoint:** `POST /api/test-update`

**Purpose:** Manually set points (for testing). Triggers push notification to update Apple Wallet pass.

### Set Points to Specific Value

#### Set to 0 points

```bash
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/test-update \
  -H "Content-Type: application/json" \
  -d '{"userId":"2663229d-8983-47ae-93d7-59df88c7b55c","points":0}'
```

#### Set to 10 points (coffee reward milestone)

```bash
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/test-update \
  -H "Content-Type: application/json" \
  -d '{"userId":"2663229d-8983-47ae-93d7-59df88c7b55c","points":10}'
```

#### Set to 25 points (meal reward milestone)

```bash
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/test-update \
  -H "Content-Type: application/json" \
  -d '{"userId":"2663229d-8983-47ae-93d7-59df88c7b55c","points":25}'
```

#### Set to 50 points (multiple rewards available)

```bash
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/test-update \
  -H "Content-Type: application/json" \
  -d '{"userId":"2663229d-8983-47ae-93d7-59df88c7b55c","points":50}'
```

### Add/Subtract Points

#### Add 1 point

```bash
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/test-update \
  -H "Content-Type: application/json" \
  -d '{"userId":"2663229d-8983-47ae-93d7-59df88c7b55c","points":1}'
```

#### Add 5 points

```bash
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/test-update \
  -H "Content-Type: application/json" \
  -d '{"userId":"2663229d-8983-47ae-93d7-59df88c7b55c","points":5}'
```

#### Subtract 1 point

```bash
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/test-update \
  -H "Content-Type: application/json" \
  -d '{"userId":"2663229d-8983-47ae-93d7-59df88c7b55c","points":-1}'
```

#### Subtract 10 points

```bash
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/test-update \
  -H "Content-Type: application/json" \
  -d '{"userId":"2663229d-8983-47ae-93d7-59df88c7b55c","points":-10}'
```

### Expected Response

```json
{
  "success": true,
  "userId": "2663229d-8983-47ae-93d7-59df88c7b55c",
  "oldPoints": 10,
  "newPoints": 15,
  "pointsAdded": 5,
  "devicesNotified": 1,
  "message": "Points updated! New balance: 15. Notified 1 device(s)."
}
```

---

## Complete Test Flows

### Test Flow 1: Full Purchase and Redemption Flow

```bash
# 1. Set user to 9 points
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/test-update \
  -H "Content-Type: application/json" \
  -d '{"userId":"2663229d-8983-47ae-93d7-59df88c7b55c","points":9}'

# 2. Check available rewards (should show none yet)
curl "https://vigo-coffee-loyalty-program.vercel.app/api/scan?userId=2663229d-8983-47ae-93d7-59df88c7b55c"

# 3. Add a purchase (should reach 10 points, earn coffee reward)
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/purchase \
  -H "Content-Type: application/json" \
  -d '{"customerId":"2663229d-8983-47ae-93d7-59df88c7b55c"}'

# 4. Check available rewards (should show coffee at 10)
curl "https://vigo-coffee-loyalty-program.vercel.app/api/scan?userId=2663229d-8983-47ae-93d7-59df88c7b55c"

# 5. Redeem the coffee reward
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/redeem \
  -H "Content-Type: application/json" \
  -d '{"customerId":"2663229d-8983-47ae-93d7-59df88c7b55c","type":"coffee","points":10}'

# 6. Check again (coffee at 10 should be gone, points still 10)
curl "https://vigo-coffee-loyalty-program.vercel.app/api/scan?userId=2663229d-8983-47ae-93d7-59df88c7b55c"
```

### Test Flow 2: Multiple Rewards Scenario

```bash
# 1. Set user to 50 points (earns: coffee at 10,20,30,40,50 and meal at 25,50)
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/test-update \
  -H "Content-Type: application/json" \
  -d '{"userId":"2663229d-8983-47ae-93d7-59df88c7b55c","points":50}'

# 2. Check all available rewards
curl "https://vigo-coffee-loyalty-program.vercel.app/api/scan?userId=2663229d-8983-47ae-93d7-59df88c7b55c"

# 3. Redeem coffee at 10
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/redeem \
  -H "Content-Type: application/json" \
  -d '{"customerId":"2663229d-8983-47ae-93d7-59df88c7b55c","type":"coffee","points":10}'

# 4. Redeem meal at 25
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/redeem \
  -H "Content-Type: application/json" \
  -d '{"customerId":"2663229d-8983-47ae-93d7-59df88c7b55c","type":"meal","points":25}'

# 5. Check remaining rewards (should show coffee at 20,30,40,50 and meal at 50)
curl "https://vigo-coffee-loyalty-program.vercel.app/api/scan?userId=2663229d-8983-47ae-93d7-59df88c7b55c"
```

### Test Flow 3: Pass Update Testing

```bash
# 1. Set user to 10 points (should show coffee reward in pass)
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/test-update \
  -H "Content-Type: application/json" \
  -d '{"userId":"2663229d-8983-47ae-93d7-59df88c7b55c","points":10}'

# 2. Wait 10-30 seconds, then check Apple Wallet pass
# Pass should update automatically showing "You earned a FREE COFFEE!"

# 3. Redeem the coffee reward
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/redeem \
  -H "Content-Type: application/json" \
  -d '{"customerId":"2663229d-8983-47ae-93d7-59df88c7b55c","type":"coffee","points":10}'

# 4. Wait 10-30 seconds, then check Apple Wallet pass
# Pass should update showing "No reward yet! Keep shopping..." (reward was redeemed)

# 5. Add more points to reach 20
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/test-update \
  -H "Content-Type: application/json" \
  -d '{"userId":"2663229d-8983-47ae-93d7-59df88c7b55c","points":20}'

# 6. Wait 10-30 seconds, then check Apple Wallet pass
# Pass should update showing "You earned a FREE COFFEE!" (for the 20 milestone)
```

---

## Quick Reference

### Base URL
```
https://vigo-coffee-loyalty-program.vercel.app
```

### Test User ID
```
2663229d-8983-47ae-93d7-59df88c7b55c
```

### Common Patterns

#### Check Customer Status
```bash
curl "https://vigo-coffee-loyalty-program.vercel.app/api/scan?userId=USER_ID"
```

#### Add Purchase
```bash
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/purchase \
  -H "Content-Type: application/json" \
  -d '{"customerId":"USER_ID"}'
```

#### Redeem Coffee
```bash
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/redeem \
  -H "Content-Type: application/json" \
  -d '{"customerId":"USER_ID","type":"coffee","points":10}'
```

#### Redeem Meal
```bash
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/redeem \
  -H "Content-Type: application/json" \
  -d '{"customerId":"USER_ID","type":"meal","points":25}'
```

#### Set Points
```bash
curl -X POST https://vigo-coffee-loyalty-program.vercel.app/api/test-update \
  -H "Content-Type: application/json" \
  -d '{"userId":"USER_ID","points":25}'
```

---

## Tips & Tricks

### Pretty Print JSON Output

If you have `jq` installed:
```bash
curl "https://vigo-coffee-loyalty-program.vercel.app/api/scan?userId=2663229d-8983-47ae-93d7-59df88c7b55c" | jq
```

### Follow Redirects

If you get redirects, use `-L` flag:
```bash
curl -L "https://vigo-coffee-loyalty-program.vercel.app/api/scan?userId=2663229d-8983-47ae-93d7-59df88c7b55c"
```

### Verbose Output

For debugging, use `-v` flag:
```bash
curl -v "https://vigo-coffee-loyalty-program.vercel.app/api/scan?userId=2663229d-8983-47ae-93d7-59df88c7b55c"
```

### Save Response to File

```bash
curl "https://vigo-coffee-loyalty-program.vercel.app/api/scan?userId=2663229d-8983-47ae-93d7-59df88c7b55c" > response.json
```

---

## Reward Milestones

### Coffee Rewards
- Earned at: **10, 20, 30, 40, 50, 60, 70, 80, 90, 100...** points
- Every 10 points

### Meal Rewards
- Earned at: **25, 50, 75, 100, 125, 150...** points
- Every 25 points

---

## Error Responses

### Customer Not Found (404)
```json
{
  "error": "Customer not found",
  "details": "No rows returned"
}
```

### Invalid Request (400)
```json
{
  "error": "Missing or invalid customerId"
}
```

### Reward Already Redeemed (400)
```json
{
  "error": "Reward already redeemed"
}
```

### Server Error (500)
```json
{
  "error": "Failed to update points",
  "details": "..."
}
```

---

## Notes

- All endpoints require the user to exist in the `profiles` table
- The `test-update` endpoint is for testing only and should not be used in production
- Pass updates are triggered automatically when points change (via push notifications)
- Pass updates may take 10-30 seconds to appear in Apple Wallet
- Redeemed rewards are tracked separately and don't affect points balance

---

**Last Updated:** December 24, 2025  
**Production URL:** `https://vigo-coffee-loyalty-program.vercel.app`

