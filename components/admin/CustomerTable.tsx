'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Coffee, UtensilsCrossed } from "lucide-react";

interface Customer {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  points_balance: number;
  total_purchases: number;
  created_at?: string;
}

interface CustomerTableProps {
  customers: Customer[];
}

export function CustomerTable({ customers }: CustomerTableProps) {
  const getInitials = (name: string | null, email: string | null) => {
    if (name && name.trim()) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email && email.trim()) {
      return email[0].toUpperCase();
    }
    return '?';
  };

  const getRewardProgress = (points: number) => {
    const safePoints = Math.max(0, points || 0);
    const nextCoffee = Math.ceil(safePoints / 10) * 10;
    const coffeeProgress = (safePoints % 10) / 10 * 100;
    const nextMeal = Math.ceil(safePoints / 25) * 25;
    const mealProgress = (safePoints % 25) / 25 * 100;
    
    return { coffeeProgress, mealProgress, nextCoffee, nextMeal };
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-transparent">
            <TableHead className="text-muted-foreground font-medium">Customer</TableHead>
            <TableHead className="text-muted-foreground font-medium">Points</TableHead>
            <TableHead className="text-muted-foreground font-medium">Purchases</TableHead>
            <TableHead className="text-muted-foreground font-medium hidden md:table-cell">Progress</TableHead>
            <TableHead className="text-muted-foreground font-medium hidden lg:table-cell">Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No customers found
              </TableCell>
            </TableRow>
          ) : (
            customers.map((customer) => {
              const { coffeeProgress, mealProgress } = getRewardProgress(customer.points_balance);
              return (
              <TableRow key={customer.id} className="table-row-hover border-border">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarFallback className="bg-accent text-accent-foreground text-sm font-medium">
                        {getInitials(customer.full_name, customer.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-foreground">
                        {customer.full_name?.trim() || 'Anonymous'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {customer.email?.trim() || 'No email'}
                      </p>
                      {customer.phone && (
                        <p className="text-xs text-muted-foreground">
                          {customer.phone.trim()}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-semibold tabular-nums">
                    {customer.points_balance} pts
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="tabular-nums text-muted-foreground">
                    {customer.total_purchases}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Coffee className="w-4 h-4 text-primary" />
                      <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, coffeeProgress))}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <UtensilsCrossed className="w-4 h-4 text-warning" />
                      <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-warning rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, mealProgress))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {customer.created_at ? new Date(customer.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'N/A'}
                  </span>
                </TableCell>
              </TableRow>
            );
          })
          )}
        </TableBody>
      </Table>
    </div>
  );
}

