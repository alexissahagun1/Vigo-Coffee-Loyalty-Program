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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { GiftCardDetails } from "./GiftCardDetails";

interface GiftCard {
  id: string;
  serial_number: string;
  recipient_name: string;
  balance_mxn: number;
  initial_balance_mxn: number;
  is_active: boolean;
  created_at: string;
  claimed_at: string | null;
  recipient_user_id: string | null;
}

interface GiftCardTableProps {
  giftCards: GiftCard[];
  onGiftCardUpdated?: () => void;
}

export function GiftCardTable({ giftCards, onGiftCardUpdated }: GiftCardTableProps) {
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedGiftCard, setSelectedGiftCard] = useState<GiftCard | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const { toast } = useToast();

  const handleViewDetails = (giftCard: GiftCard) => {
    setSelectedGiftCard(giftCard);
    setDetailsDialogOpen(true);
  };

  const handleToggleActive = async (giftCard: GiftCard) => {
    setIsToggling(true);
    try {
      const response = await fetch(`/api/admin/gift-cards/${giftCard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !giftCard.is_active,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update gift card');
      }

      toast({
        title: "Gift card updated",
        description: `Gift card is now ${!giftCard.is_active ? 'active' : 'inactive'}.`,
      });

      if (onGiftCardUpdated) {
        onGiftCardUpdated();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update gift card. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsToggling(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <Table className="w-full min-w-[1000px]">
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="text-muted-foreground font-medium min-w-[200px]">Recipient</TableHead>
              <TableHead className="text-muted-foreground font-medium w-[150px]">Serial Number</TableHead>
              <TableHead className="text-muted-foreground font-medium w-[120px]">Balance</TableHead>
              <TableHead className="text-muted-foreground font-medium w-[120px]">Initial Balance</TableHead>
              <TableHead className="text-muted-foreground font-medium w-[100px]">Status</TableHead>
              <TableHead className="text-muted-foreground font-medium hidden md:table-cell w-[120px]">Created</TableHead>
              <TableHead className="text-muted-foreground font-medium hidden lg:table-cell w-[120px]">Claimed</TableHead>
              <TableHead className="text-muted-foreground font-medium text-right w-[120px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {giftCards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No gift cards found
                </TableCell>
              </TableRow>
            ) : (
              giftCards.map((giftCard) => (
                <TableRow key={giftCard.id} className="table-row-hover border-border">
                  <TableCell>
                    <div>
                      <p className="font-medium text-foreground">
                        {giftCard.recipient_name}
                      </p>
                      {giftCard.recipient_user_id && (
                        <p className="text-xs text-muted-foreground">
                          Account linked
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {giftCard.serial_number.substring(0, 8)}...
                    </code>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold tabular-nums text-foreground">
                      {formatCurrency(giftCard.balance_mxn)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="tabular-nums text-muted-foreground">
                      {formatCurrency(giftCard.initial_balance_mxn)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge 
                        variant={giftCard.is_active ? "default" : "secondary"}
                        className="w-fit"
                      >
                        {giftCard.is_active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                      {giftCard.claimed_at && (
                        <Badge variant="outline" className="w-fit text-xs">
                          Claimed
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(giftCard.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {giftCard.claimed_at ? (
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {new Date(giftCard.claimed_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not claimed</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(giftCard)}
                        className="text-foreground hover:text-foreground hover:bg-accent"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(giftCard)}
                        disabled={isToggling}
                        className={
                          giftCard.is_active
                            ? "text-destructive hover:text-destructive hover:bg-destructive/10"
                            : "text-green-600 hover:text-green-700 hover:bg-green-50"
                        }
                      >
                        {isToggling ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : giftCard.is_active ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gift Card Details</DialogTitle>
            <DialogDescription>
              View detailed information and transaction history for this gift card.
            </DialogDescription>
          </DialogHeader>
          {selectedGiftCard && (
            <GiftCardDetails
              giftCardId={selectedGiftCard.id}
              onClose={() => setDetailsDialogOpen(false)}
              onUpdated={onGiftCardUpdated}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
