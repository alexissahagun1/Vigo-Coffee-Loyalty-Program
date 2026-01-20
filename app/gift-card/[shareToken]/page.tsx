"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Gift, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GiftCardData {
  id: string;
  serialNumber: string;
  recipientName: string;
  balance: number;
  initialBalance: number;
  isActive: boolean;
  claimedAt: string | null;
}

export default function GiftCardSharePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const shareToken = params.shareToken as string;
  
  const [giftCard, setGiftCard] = useState<GiftCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchGiftCard = async () => {
      if (!shareToken) {
        setError("Invalid share token");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/gift-cards/share/${shareToken}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch gift card");
        }

        setGiftCard(data.giftCard);
      } catch (err: any) {
        setError(err.message || "Failed to load gift card");
        toast({
          title: "Error",
          description: err.message || "Failed to load gift card",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchGiftCard();
  }, [shareToken, toast]);

  const handleAddToWallet = async () => {
    if (!giftCard) return;

    setDownloading(true);
    try {
      const response = await fetch(`/api/wallet/gift-card?serialNumber=${encodeURIComponent(giftCard.serialNumber)}`);
      
      if (!response.ok) {
        throw new Error("Failed to generate pass");
      }

      // Get the pass file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "gift-card.pkpass";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Gift Card Downloaded",
        description: "Tap the downloaded file to add it to your Apple Wallet",
        className: "bg-success text-success-foreground border-success",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to download gift card",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg text-foreground">Loading gift card...</p>
        </div>
      </div>
    );
  }

  if (error || !giftCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/10 flex items-center justify-center">
        <Card className="bg-card border-border shadow-lg max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-destructive mb-4">Gift Card Not Found</h2>
              <p className="text-muted-foreground mb-4">{error || "The gift card you're looking for doesn't exist or has been removed."}</p>
              <Button onClick={() => router.push('/')} variant="outline">
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/10">
      <div className="container mx-auto p-4 max-w-2xl">
        <div className="flex flex-col items-center mb-6">
          <Image
            src="/assets/vigo-logo.jpg"
            alt="Vigo Logo"
            width={120}
            height={120}
            className="mb-4 rounded-lg"
            priority
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          <h1 className="text-4xl font-bold text-center text-foreground font-display mb-2">
            Gift Card
          </h1>
        </div>

        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle className="text-foreground text-center">Gift Card Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-foreground">
                For: {giftCard.recipientName}
              </p>
              <p className="text-4xl font-bold text-primary">
                {formatCurrency(giftCard.balance)}
              </p>
              <p className="text-sm text-muted-foreground">
                Initial Balance: {formatCurrency(giftCard.initialBalance)}
              </p>
            </div>

            {!giftCard.isActive && (
              <div className="bg-warning/10 border border-warning text-warning-foreground px-4 py-3 rounded">
                <p className="font-semibold">This gift card is inactive</p>
              </div>
            )}

            {giftCard.balance === 0 && (
              <div className="bg-muted border border-border text-foreground px-4 py-3 rounded">
                <p className="font-semibold">Balance is zero</p>
              </div>
            )}

            <div className="pt-4 border-t border-border">
              <Button
                onClick={handleAddToWallet}
                disabled={downloading || !giftCard.isActive}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                {downloading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Add to Apple Wallet
                  </>
                )}
              </Button>
              
              <p className="text-sm text-muted-foreground text-center mt-4">
                After adding to your wallet, you can share this gift card with the recipient using Apple Wallet's native sharing feature.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
