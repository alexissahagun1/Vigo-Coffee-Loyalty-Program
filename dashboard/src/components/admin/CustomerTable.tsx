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
  points_balance: number;
  total_purchases: number;
  created_at: string;
}

interface CustomerTableProps {
  customers: Customer[];
}

export function CustomerTable({ customers }: CustomerTableProps) {
  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return '?';
  };

  const getRewardProgress = (points: number) => {
    const nextCoffee = Math.ceil(points / 10) * 10;
    const coffeeProgress = (points % 10) / 10 * 100;
    const nextMeal = Math.ceil(points / 25) * 25;
    const mealProgress = (points % 25) / 25 * 100;
    
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
          {customers.map((customer) => {
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
                        {customer.full_name || 'Anonymous'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {customer.email || 'No email'}
                      </p>
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
                          style={{ width: `${coffeeProgress}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <UtensilsCrossed className="w-4 h-4 text-warning" />
                      <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-warning rounded-full transition-all duration-500"
                          style={{ width: `${mealProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {new Date(customer.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
