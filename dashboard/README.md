# Admin Dashboard Integration Package

This folder contains all the necessary files to integrate the admin perks hub dashboard into your Next.js project.

## 📁 Folder Structure

```
dashboard/
├── app/
│   ├── admin/
│   │   └── page.tsx          # Main dashboard page (copy to your-repo/app/admin/)
│   ├── providers.tsx          # QueryClient provider (copy to your-repo/app/)
│   └── globals.css            # CSS variables and styles (merge with your globals.css)
├── src/
│   ├── components/
│   │   └── admin/             # All dashboard components (copy to your-repo/src/components/)
│   ├── lib/
│   │   ├── utils.ts           # Utility functions (copy to your-repo/src/lib/)
│   │   └── mockData.ts        # Mock data - replace with API calls (copy to your-repo/src/lib/)
│   └── hooks/
│       ├── use-mobile.tsx      # Mobile detection hook (copy to your-repo/src/hooks/)
│       └── use-toast.ts        # Toast hook (copy to your-repo/src/hooks/)
└── public/
    └── assets/                 # Images (copy to your-repo/public/assets/)
```

## 🚀 Quick Integration Steps

### 1. Copy Files to Your Repo

```bash
# From your-repo root directory
cp -r dashboard/app/admin your-repo/app/
cp dashboard/app/providers.tsx your-repo/app/
cp -r dashboard/src/components/admin your-repo/src/components/
cp dashboard/src/lib/utils.ts your-repo/src/lib/
cp dashboard/src/lib/mockData.ts your-repo/src/lib/
cp dashboard/src/hooks/* your-repo/src/hooks/
cp -r dashboard/public/assets your-repo/public/
```

### 2. Update Your Root Layout

Add to your `app/layout.tsx`:

```typescript
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "./providers";
import "./globals.css"; // Your existing globals.css

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

### 3. Merge CSS Variables

Copy the CSS variables from `dashboard/app/globals.css` into your existing `app/globals.css`. Look for the `:root` and `.dark` sections with all the CSS variables.

### 4. Update Dependencies

Add these to your `package.json` if missing:

```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.83.0",
    "@radix-ui/react-accordion": "^1.2.11",
    "@radix-ui/react-alert-dialog": "^1.1.14",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-checkbox": "^1.3.2",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-dropdown-menu": "^2.1.15",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-popover": "^1.1.14",
    "@radix-ui/react-select": "^2.2.5",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-switch": "^1.2.5",
    "@radix-ui/react-tabs": "^1.1.12",
    "@radix-ui/react-toast": "^1.2.14",
    "@radix-ui/react-tooltip": "^1.2.7",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.462.0",
    "sonner": "^1.7.4",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    "zod": "^3.25.76",
    "recharts": "^2.15.4"
  }
}
```

### 5. Update Tailwind Config

Add these colors to your `tailwind.config.ts`:

```typescript
theme: {
  extend: {
    colors: {
      border: "hsl(var(--border))",
      background: "hsl(var(--background))",
      foreground: "hsl(var(--foreground))",
      primary: {
        DEFAULT: "hsl(var(--primary))",
        foreground: "hsl(var(--primary-foreground))",
      },
      secondary: {
        DEFAULT: "hsl(var(--secondary))",
        foreground: "hsl(var(--secondary-foreground))",
      },
      // ... see globals.css for full list
    }
  }
}
```

### 6. Replace Mock Data

Update `src/lib/mockData.ts` or create API hooks:

```typescript
// src/lib/api.ts
import { useQuery } from "@tanstack/react-query";

export function useCustomers() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch('/api/customers');
      return res.json();
    }
  });
}
```

Then update `app/admin/page.tsx` to use the API hooks instead of mock data.

## ✅ Verification

1. Install dependencies: `npm install`
2. Check TypeScript: `npx tsc --noEmit`
3. Build: `npm run build`
4. Test: `npm run dev` and visit `http://localhost:3000/admin`

## 📝 Notes

- All admin components have `'use client'` directive
- Images use Next.js `Image` component
- The dashboard uses TanStack Query for data fetching
- CSS variables support light and dark modes
- All shadcn/ui components are included in the components folder

## 🎯 Access

Once integrated, the dashboard will be available at:

```
http://localhost:3000/admin
```

## 📚 Components Included

- **DashboardHeader**: Header with logo and user info
- **StatCard**: Statistics display cards
- **CustomerTable**: Customer management table
- **EmployeeTable**: Employee management table
- **InvitationTable**: Invitation management table
- **InviteForm**: Form to invite new employees
- **TopCustomers**: Top customers leaderboard

## 🔧 Troubleshooting

### CSS not loading
- Ensure `globals.css` is imported in `app/layout.tsx`
- Check Tailwind config includes `app/**/*.{ts,tsx}`

### Import errors
- Verify `tsconfig.json` has correct path aliases (`@/*`)
- Check that all components are in the correct directories

### TypeScript errors
- Install all dependencies from `package.json`
- Ensure `@types/react` and `@types/react-dom` are installed

---

**Ready to integrate!** Copy the files and follow the steps above.

