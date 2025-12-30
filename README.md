# Vigo Coffee Loyalty Program

A comprehensive loyalty program application with support for Apple Wallet and Google Wallet passes.

## Features

- 🎫 **Digital Wallet Integration**
  - Apple Wallet pass generation and updates
  - Google Wallet pass generation and updates
  - Real-time pass updates via push notifications

- ☕ **Loyalty Rewards System**
  - Points-based rewards (1 point per purchase)
  - Coffee rewards at 10 points
  - Meal rewards at 25 points
  - Reward redemption tracking

- 👥 **Customer Management**
  - Customer registration and profiles
  - Points balance tracking
  - Purchase history
  - Reward redemption history

- 👨‍💼 **Employee Portal**
  - Employee authentication
  - QR code scanning for customer lookup
  - Purchase processing
  - Reward redemption

- 📊 **Admin Dashboard**
  - Customer analytics
  - Employee management
  - Transaction history
  - Performance metrics

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: TanStack Query

## Getting Started

### Prerequisites

- Node.js 18+ 
- Supabase account and project
- Apple Developer account (for Apple Wallet)
- Google Wallet API credentials (for Google Wallet)

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd vigo-loyalty
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Copy `.env.example` to `.env.local` and fill in your credentials:
- Supabase URL and keys
- Apple Wallet certificates
- Google Wallet credentials
- Other required environment variables

4. Run the development server
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── admin/             # Admin dashboard
│   ├── auth/              # Authentication pages
│   ├── join/              # Customer registration
│   ├── login/             # Login page
│   └── scan/              # Employee scan page
├── components/            # React components
│   ├── admin/            # Admin dashboard components
│   └── ui/               # UI components (shadcn)
├── lib/                   # Utility libraries
│   ├── google-wallet/    # Google Wallet integration
│   ├── passkit/          # Apple Wallet integration
│   └── supabase/         # Supabase clients
└── __tests__/            # Test files
```

## Key Features

### Wallet Passes
- Dynamic pass generation with tiger-themed backgrounds
- Real-time updates when points change
- Push notifications for instant updates
- Support for both Apple and Google Wallet

### Reward System
- Automatic reward detection at thresholds
- Prevents duplicate reward redemption
- Tracks redeemed rewards per customer
- Visual feedback for available rewards

### Employee Tools
- QR code scanning for quick customer lookup
- One-click purchase processing
- Reward redemption interface
- Transaction logging

## Testing

Run the test suite:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Deployment

The application is configured for deployment on Vercel. See `DEPLOYMENT-CHECKLIST.md` for detailed deployment instructions.

## Documentation

- `API-TESTING-COMMANDS.md` - API endpoint testing guide
- `DEPLOYMENT-CHECKLIST.md` - Deployment instructions
- `TESTING-AND-BUGS-SUMMARY.md` - Test coverage and bug reports
- `APPLE-WALLET-REAL-TIME-UPDATES.md` - Apple Wallet implementation details

## License

Proprietary - Vigo Coffee
