'use client';

import Image from "next/image";

interface DashboardHeaderProps {
  username?: string;
}

export function DashboardHeader({ username }: DashboardHeaderProps) {
  const displayName = username || 'Admin';
  const initials = displayName
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image 
              src="/assets/vigo-banner.png" 
              alt="Vigo Coffee" 
              height={40}
              width={200}
              priority
              className="h-10 w-auto"
              style={{ width: 'auto', height: 'auto' }}
            />
            <div className="hidden sm:block">
              <div className="h-8 w-px bg-border" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-display font-semibold text-foreground">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground">Loyalty Program Management</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-sm font-medium text-foreground">Welcome back, {displayName}</p>
              <p className="text-xs text-muted-foreground">Admin</p>
            </div>
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">{initials}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

