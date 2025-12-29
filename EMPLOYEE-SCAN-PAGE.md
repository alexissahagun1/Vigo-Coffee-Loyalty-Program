# Employee Scan Page - Functional Flow Documentation

## Overview
Employee-facing page for scanning customer QR codes from Apple Wallet passes. Employees can view customer info, record purchases (add points), and redeem rewards.

## Functional Flow

### Step 1: Employee Opens Scan Page
- Navigate to `/scan`
- Camera activates automatically
- Ready to scan QR codes

### Step 2: Employee Scans QR Code
- Customer shows QR code from Apple Wallet pass
- Camera detects QR code
- System extracts user ID from QR data
- Automatically fetches customer data from database

### Step 3: Display Customer Information
Shows:
- **Customer Name**: Full name from profile
- **Current Points Balance**: Current points_balance value
- **Available Rewards**: 
  - Coffee rewards: Earned at 10, 20, 30, 40, 50... points (if points ≥ threshold AND not redeemed)
  - Meal rewards: Earned at 25, 50, 75, 100... points (if points ≥ threshold AND not redeemed)

### Step 4: Employee Takes Action

#### Option A: Record Purchase
- Employee clicks "Add Purchase" button
- API call to `/api/purchase` with customer user ID
- System adds 1 point to customer's balance
- Push notification sent → Apple Wallet pass updates automatically
- Success message displayed
- Points display updates in real-time

#### Option B: Redeem Reward
- Employee clicks "Redeem Coffee (10 pts)" or "Redeem Meal (25 pts)" button
- API call to `/api/redeem` with customer user ID and reward type/points
- System marks reward as redeemed in `redeemed_rewards` field (NO point deduction)
- Success message displayed
- Reward removed from available rewards list

### Step 5: Ready for Next Customer
- Employee can scan another QR code
- Process repeats from Step 2

## Data Flow

1. **QR Scan** → Extract user ID from QR code data
2. **Fetch Profile** → Query `profiles` table for user ID → Get `points_balance` + `redeemed_rewards`
3. **Calculate Available Rewards** → 
   - Coffee: Check if points ≥ 10, 20, 30... AND not in `redeemed_rewards.coffees[]`
   - Meal: Check if points ≥ 25, 50, 75... AND not in `redeemed_rewards.meals[]`
4. **Action Taken** → Update database (points or redeemed_rewards)
5. **Pass Updated** → Push notification sent via APNs → Apple Wallet updates automatically

## Reward Logic

### Coffee Rewards
- Earned at: 10, 20, 30, 40, 50, 60, 70, 80, 90, 100... points
- Available = Points ≥ threshold AND threshold not in `redeemed_rewards.coffees[]`

### Meal Rewards
- Earned at: 25, 50, 75, 100, 125, 150... points
- Available = Points ≥ threshold AND threshold not in `redeemed_rewards.meals[]`

### Example
- Customer has 23 points
- Earned: Coffee at 10, 20; Meal at 25
- Redeemed: Coffee at 10 (in `redeemed_rewards.coffees: [10]`)
- Available: Coffee at 20, Meal at 25
- Employee can redeem Coffee at 20 or Meal at 25 (marks as redeemed, points stay at 23)

## Database Schema Changes Needed

### Add to `profiles` table:
```sql
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS redeemed_rewards JSONB DEFAULT '{"coffees": [], "meals": []}'::jsonb;
```

### Structure:
```json
{
  "coffees": [10, 20, 30],  // List of redeemed coffee milestone points
  "meals": [25, 50]         // List of redeemed meal milestone points
}
```

## API Endpoints Needed

### 1. GET /api/scan?userId=xxx
**Purpose**: Get customer info and available rewards

**Response**:
```json
{
  "success": true,
  "customer": {
    "id": "user-id",
    "name": "John Doe",
    "points": 23,
    "availableRewards": {
      "coffees": [20],
      "meals": [25]
    },
    "redeemedRewards": {
      "coffees": [10],
      "meals": []
    }
  }
}
```

### 2. POST /api/purchase
**Purpose**: Record purchase (add 1 point)
**Body**: `{ "customerId": "user-id" }`
**Already exists** - may need to verify it works with this flow

### 3. POST /api/redeem
**Purpose**: Redeem reward (mark as redeemed, no point deduction)
**Body**: `{ "customerId": "user-id", "type": "coffee", "points": 20 }`
**New endpoint needed**

## Technical Requirements

### QR Scanner Library
- Use `html5-qrcode` or similar for camera-based QR scanning
- Must work on mobile browsers (iOS Safari, Chrome)

### Page Route
- `/scan` - Employee scan page

### Components Needed
- QR Scanner component (camera access)
- Customer Info Display component
- Action Buttons component (Add Purchase, Redeem buttons)

## Key Principles
- **Simple & Reliable**: Basic functionality, no extra features
- **No Point Deduction**: Redeeming rewards does NOT subtract points
- **Real-time Updates**: Pass updates automatically via push notifications
- **Employee-Only**: Only employees can add points or redeem rewards
- **Mobile-First**: Designed for phone camera scanning


