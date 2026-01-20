"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Share2, Loader2, Gift } from "lucide-react";

interface GiftCardData {
  id: string;
  serial_number: string;
  recipient_name: string;
  balance_mxn: number;
  initial_balance_mxn: number;
  shareableLink: string;
  share_token?: string; // Optional, used to reconstruct URL client-side
}

export default function CreateGiftCardPage() {
  const [isEmployee, setIsEmployee] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [giftCard, setGiftCard] = useState<GiftCardData | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const checkEmployee = async () => {
      try {
        const supabase = createClient();

        const userResult = await supabase.auth.getUser();
        const user = userResult.data.user;

        if (!user) {
          router.push("/login");
          return;
        }

        const checkResponse = await fetch('/api/auth/employee/check');
        const checkData = await checkResponse.json();

        if (!checkResponse.ok || !checkData.success || !checkData.isEmployee) {
          router.push("/login");
          return;
        }

        setIsEmployee(true);
      } catch (err) {
        console.error("Error checking employee status:", err);
        router.push("/login");
      }
    };

    checkEmployee();
  }, [router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/admin/gift-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientName,
          initialBalanceMxn: parseFloat(initialBalance),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create gift card");
      }

      setGiftCard(data.giftCard);
      toast({
        title: "Gift Card Created",
        description: "Gift card created successfully!",
        className: "bg-success text-success-foreground border-success",
      });
    } catch (err: any) {
      const errorMessage = err.message || "Failed to create gift card";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Reconstruct shareable link using current window origin
  // This ensures it works when accessed via local network IP
  const getShareableLink = () => {
    if (!giftCard) return '';
    // If we have share_token, reconstruct URL using current origin
    if (giftCard.share_token) {
      const baseUrl = typeof window !== 'undefined' 
        ? window.location.origin 
        : '';
      return `${baseUrl}/gift-card/${giftCard.share_token}`;
    }
    // Fallback to server-provided link
    return giftCard.shareableLink || '';
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

  const handleNativeShare = async () => {
    const link = getShareableLink();
    if (!link || !giftCard) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Gift Card",
          text: `Gift card for ${giftCard.recipient_name}`,
          url: link,
        });
      } catch (err: any) {
        // User cancelled or error occurred
        if (err.name !== "AbortError") {
          console.error("Error sharing:", err);
        }
      }
    } else {
      // Fallback to copy if share API not available
      handleCopyLink();
    }
  };

  const handleCreateAnother = () => {
    setGiftCard(null);
    setRecipientName("");
    setInitialBalance("");
    setError(null);
  };

  if (isEmployee === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg text-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  if (isEmployee === false) {
    return null;
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
          <h1 className="text-4xl font-bold text-center text-foreground font-display">
            Create Gift Card
          </h1>
        </div>

        {!giftCard ? (
          <Card className="bg-card border-border shadow-lg">
            <CardHeader>
              <CardTitle className="text-foreground">Gift Card Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="recipientName" className="text-foreground">
                    Recipient Name *
                  </Label>
                  <Input
                    id="recipientName"
                    type="text"
                    placeholder="Enter recipient name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    required
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="initialBalance" className="text-foreground">
                    Initial Balance (MXN) *
                  </Label>
                  <Input
                    id="initialBalance"
                    type="number"
                    placeholder="Enter amount (minimum 10 MXN)"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    min="10"
                    step="0.01"
                    required
                    className="bg-background"
                  />
                  <p className="text-sm text-muted-foreground">
                    Minimum balance: 10 MXN
                  </p>
                </div>

                {error && (
                  <div className="bg-destructive/10 border border-destructive text-destructive-foreground px-4 py-3 rounded">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Gift className="mr-2 h-4 w-4" />
                      Create Gift Card
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="bg-card border-border shadow-lg">
              <CardHeader>
                <CardTitle className="text-foreground text-green-600">
                  Gift Card Created Successfully!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold text-foreground">
                    For: {giftCard.recipient_name}
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    ${giftCard.initial_balance_mxn.toFixed(2)} MXN
                  </p>
                </div>

                <div className="flex justify-center">
                  <div className="bg-white p-4 rounded-lg">
                    <QRCodeSVG
                      value={getShareableLink()}
                      size={300}
                      level="H"
                      includeMargin={true}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Shareable Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={getShareableLink()}
                      readOnly
                      className="bg-background font-mono text-sm"
                    />
                    <Button
                      type="button"
                      onClick={handleCopyLink}
                      variant="outline"
                      size="icon"
                      title="Copy link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  {typeof navigator !== 'undefined' && 'share' in navigator && (
                    <Button
                      onClick={handleNativeShare}
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Link
                    </Button>
                  )}
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    className="flex-1"
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    Give this QR code or link to the requester. They will add it to their iPhone,
                    then share it to the recipient via Apple Wallet.
                  </p>
                  <Button
                    onClick={handleCreateAnother}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    variant="outline"
                  >
                    <Gift className="mr-2 h-4 w-4" />
                    Create Another Gift Card
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
