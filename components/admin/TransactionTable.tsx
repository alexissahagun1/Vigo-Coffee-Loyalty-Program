'use client';

import { useMemo, useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ShoppingBag, 
  Coffee, 
  UtensilsCrossed, 
  TrendingUp, 
  Search,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from "lucide-react";

interface Transaction {
  id: string;
  customer_id: string;
  customer_name: string | null;
  customer_email: string | null;
  employee_id: string | null;
  employee_name: string | null;
  employee_username: string | null;
  type: 'purchase' | 'redemption_coffee' | 'redemption_meal';
  points_change: number;
  points_balance_after: number;
  reward_points_threshold: number | null;
  created_at: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

function formatTransactionDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  }
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric', 
    hour: 'numeric', 
    minute: '2-digit' 
  });
}

function getInitials(name: string | null, email: string | null) {
  if (name && name.trim()) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  if (email && email.trim()) {
    return email[0].toUpperCase();
  }
  return '?';
}

type SortOption = 
  | "date-desc" 
  | "date-asc" 
  | "customer-asc" 
  | "customer-desc" 
  | "type-asc" 
  | "type-desc"
  | "points-desc"
  | "points-asc";

export function TransactionTable({ transactions, isLoading }: TransactionTableProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = transactions.filter((transaction) => {
      const matchesSearch = !debouncedSearch || 
        transaction.customer_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        transaction.customer_email?.toLowerCase().includes(debouncedSearch.toLowerCase());
      
      const matchesType = typeFilter === "all" || transaction.type === typeFilter;
      
      return matchesSearch && matchesType;
    });

    // Sort transactions
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "date-asc":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "customer-asc":
          return (a.customer_name || a.customer_email || "").localeCompare(
            b.customer_name || b.customer_email || ""
          );
        case "customer-desc":
          return (b.customer_name || b.customer_email || "").localeCompare(
            a.customer_name || a.customer_email || ""
          );
        case "type-asc":
          return a.type.localeCompare(b.type);
        case "type-desc":
          return b.type.localeCompare(a.type);
        case "points-desc":
          return b.points_balance_after - a.points_balance_after;
        case "points-asc":
          return a.points_balance_after - b.points_balance_after;
        default:
          return 0;
      }
    });

    return sorted;
  }, [transactions, debouncedSearch, typeFilter, sortBy]);

  const getSortLabel = () => {
    switch (sortBy) {
      case "date-desc": return "Date (Newest)";
      case "date-asc": return "Date (Oldest)";
      case "customer-asc": return "Customer (A-Z)";
      case "customer-desc": return "Customer (Z-A)";
      case "type-asc": return "Type (A-Z)";
      case "type-desc": return "Type (Z-A)";
      case "points-desc": return "Points (High)";
      case "points-asc": return "Points (Low)";
      default: return "Sort";
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={typeFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("all")}
          >
            All
          </Button>
          <Button
            type="button"
            variant={typeFilter === "purchase" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("purchase")}
          >
            Purchase
          </Button>
          <Button
            type="button"
            variant={typeFilter === "redemption_coffee" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("redemption_coffee")}
          >
            Coffee
          </Button>
          <Button
            type="button"
            variant={typeFilter === "redemption_meal" ? "default" : "outline"}
            size="sm"
            onClick={() => setTypeFilter("redemption_meal")}
          >
            Meal
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowUpDown className="w-4 h-4" />
                {getSortLabel()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy("date-desc")}>
                <ArrowDown className="w-4 h-4 mr-2" />
                Date (Newest First)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("date-asc")}>
                <ArrowUp className="w-4 h-4 mr-2" />
                Date (Oldest First)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("customer-asc")}>
                Customer (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("customer-desc")}>
                Customer (Z-A)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("type-asc")}>
                Type (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("type-desc")}>
                Type (Z-A)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("points-desc")}>
                <ArrowDown className="w-4 h-4 mr-2" />
                Points (High to Low)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("points-asc")}>
                <ArrowUp className="w-4 h-4 mr-2" />
                Points (Low to High)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium">Date/Time</TableHead>
              <TableHead className="text-muted-foreground font-medium">Customer</TableHead>
              <TableHead className="text-muted-foreground font-medium">Type</TableHead>
              <TableHead className="text-muted-foreground font-medium">Points</TableHead>
              <TableHead className="text-muted-foreground font-medium hidden md:table-cell">Employee</TableHead>
              <TableHead className="text-muted-foreground font-medium hidden lg:table-cell">Reward</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {transactions.length === 0
                    ? "No transactions found. Transactions will appear here as customers make purchases or redeem rewards."
                    : "No transactions match your filters. Try adjusting your search or filter criteria."}
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedTransactions.map((transaction) => {
                const isPurchase = transaction.type === 'purchase';
                const isCoffee = transaction.type === 'redemption_coffee';
                const isMeal = transaction.type === 'redemption_meal';

                return (
                  <TableRow key={transaction.id} className="table-row-hover border-border">
                    <TableCell>
                      <span className="text-sm text-foreground">
                        {formatTransactionDate(transaction.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-border">
                          <AvatarFallback className="bg-accent text-accent-foreground text-sm font-medium">
                            {getInitials(transaction.customer_name, transaction.customer_email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">
                            {transaction.customer_name?.trim() || 'Anonymous'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {transaction.customer_email?.trim() || 'No email'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isPurchase && (
                        <Badge className="bg-success/15 text-success border-0 gap-1">
                          <ShoppingBag className="w-3 h-3" />
                          Purchase
                        </Badge>
                      )}
                      {isCoffee && (
                        <Badge className="bg-primary/15 text-primary border-0 gap-1">
                          <Coffee className="w-3 h-3" />
                          Coffee Reward
                        </Badge>
                      )}
                      {isMeal && (
                        <Badge className="bg-warning/15 text-warning border-0 gap-1">
                          <UtensilsCrossed className="w-3 h-3" />
                          Meal Reward
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {isPurchase ? (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4 text-success" />
                            <span className="text-success font-semibold tabular-nums">
                              +{transaction.points_change} pts
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground tabular-nums">
                            0 pts
                          </span>
                        )}
                        <Badge variant="secondary" className="font-semibold tabular-nums w-fit">
                          {transaction.points_balance_after} pts
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {transaction.employee_name || transaction.employee_username ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7 border border-border">
                            <AvatarFallback className="bg-accent text-accent-foreground text-xs font-medium">
                              {getInitials(transaction.employee_name, transaction.employee_username)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm text-foreground">
                            {transaction.employee_name || transaction.employee_username}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {transaction.reward_points_threshold ? (
                        <Badge variant="secondary" className="font-semibold tabular-nums">
                          {transaction.reward_points_threshold} pts
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

