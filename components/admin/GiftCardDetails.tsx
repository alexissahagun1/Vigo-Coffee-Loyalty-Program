'use client';

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, CheckCircle2, XCircle, Calendar, User, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface GiftCardDetailsProps {
  giftCardId: string;
  onClose?: () => void;
  onUpdated?: () => void;
}

interface GiftCard {
  id: string;
  serial_number: string;
  recipient_name: string;
  balance_mxn: number;
  initial_balance_mxn: number;
  share_token: string;
  is_active: boolean;
  created_at: string;
  claimed_at: string | null;
  recipient_user_id: string | null;
  transactions?: Transaction[];
  recipientProfile?: {
    id: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

interface Transaction {
  id: string;
  amount_mxn: number;
  balance_after_mxn: number;
  description: string | null;
  created_at: string;
  employee_id: string | null;
}

async function fetchGiftCardDetails(id: string) {
  const res = await fetch(`/api/admin/gift-cards/${id}`);
  if (!res.ok) throw new Error('Failed to fetch gift card details');
  const data = await res.json();
  return data.giftCard;
}

export function GiftCardDetails({ giftCardId, onClose, onUpdated }: GiftCardDetailsProps) {
  const { toast } = useToast();
  const { data: giftCard, isLoading, refetch } = useQuery<GiftCard>({
    queryKey: ['gift-card-details', giftCardId],
    queryFn: () => fetchGiftCardDetails(giftCardId),
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getShareableLink = () => {
    if (!giftCard?.share_token) return '';
    const baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'http://localhost:3000';
    return `${baseUrl}/gift-card/${giftCard.share_token}`;
  };

  const handleCopyLink = async () => {
    const link = getShareableLink();
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "Link Copied",
        description: "Shareable link copied to clipboard!",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy link",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!giftCard) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Gift card not found
      </div>
    );
  }

  const shareableLink = getShareableLink();
  const balanceUsed = giftCard.initial_balance_mxn - giftCard.balance_mxn;
  const balanceUsedPercent = giftCard.initial_balance_mxn > 0
    ? (balanceUsed / giftCard.initial_balance_mxn) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Gift Card Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Gift Card Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Recipient Name</p>
              <p className="text-lg font-semibold">{giftCard.recipient_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Serial Number</p>
              <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                {giftCard.serial_number}
              </code>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(giftCard.balance_mxn)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Initial Balance</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(giftCard.initial_balance_mxn)}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Balance Used</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{formatCurrency(balanceUsed)}</span>
                  <span>{balanceUsedPercent.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(100, balanceUsedPercent)}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant={giftCard.is_active ? "default" : "secondary"}>
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
                <Badge variant="outline">
                  <Calendar className="w-3 h-3 mr-1" />
                  Claimed {new Date(giftCard.claimed_at).toLocaleDateString()}
                </Badge>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-sm">{formatDate(giftCard.created_at)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Shareable Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {shareableLink && (
              <>
                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg">
                    <QRCodeSVG
                      value={shareableLink}
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Link</p>
                  <div className="flex gap-2">
                    <code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono break-all">
                      {shareableLink}
                    </code>
                    <Button
                      type="button"
                      onClick={handleCopyLink}
                      variant="outline"
                      size="icon"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recipient Account Info */}
      {giftCard.recipientProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              Recipient Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{giftCard.recipientProfile.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{giftCard.recipientProfile.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{giftCard.recipientProfile.phone || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!giftCard.transactions || giftCard.transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No transactions yet
            </p>
          ) : (
            <div className="rounded-xl border border-border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Balance After</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {giftCard.transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-sm">
                        {formatDate(transaction.created_at)}
                      </TableCell>
                      <TableCell className="font-semibold text-destructive">
                        -{formatCurrency(Math.abs(transaction.amount_mxn))}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(transaction.balance_after_mxn)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {transaction.description || 'Purchase'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
