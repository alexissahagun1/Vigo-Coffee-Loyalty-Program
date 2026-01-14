'use client';

import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Coffee, UtensilsCrossed, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  onCustomerDeleted?: () => void;
}

export function CustomerTable({ customers, onCustomerDeleted }: CustomerTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!customerToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/customers?id=${customerToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete customer');
      }

      toast({
        title: "Customer deleted",
        description: "The customer has been successfully removed.",
      });

      setDeleteDialogOpen(false);
      setCustomerToDelete(null);
      
      // Refresh the customer list
      if (onCustomerDeleted) {
        onCustomerDeleted();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete customer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

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
            <TableHead className="text-muted-foreground font-medium text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
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
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(customer)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })
          )}
        </TableBody>
      </Table>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Customer</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {customerToDelete?.full_name || 'this customer'}? 
              This action cannot be undone. All associated data including points, purchases, and transactions will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setCustomerToDelete(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

