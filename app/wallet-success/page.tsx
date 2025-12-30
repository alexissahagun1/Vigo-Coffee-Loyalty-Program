"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";

function WalletSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [walletType, setWalletType] = useState<string | null>(null);

  useEffect(() => {
    const type = searchParams.get("type") || "wallet";
    setWalletType(type);
  }, [searchParams]);

  const walletName = walletType === "apple" ? "Apple Wallet" : walletType === "google" ? "Google Wallet" : "Wallet";

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Success!</CardTitle>
            <CardDescription>
              Your loyalty card has been added to {walletName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Your Vigo Coffee loyalty card is now in your {walletName}. 
                Start earning points with every purchase!
              </p>
              {walletType === "apple" && (
                <p className="text-xs text-muted-foreground mt-4">
                  💡 Tip: Make sure to enable automatic updates in your Apple Wallet settings 
                  to keep your points balance up to date.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 pt-4">
              <Button 
                onClick={() => router.push("/")}
                className="w-full"
                size="lg"
              >
                Continue
              </Button>
              <Button 
                onClick={() => router.push("/join")}
                variant="outline"
                className="w-full"
              >
                Back to Join
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="w-16 h-16 text-amber-600 animate-spin" />
            </div>
            <CardTitle className="text-2xl">Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

export default function WalletSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <WalletSuccessContent />
    </Suspense>
  );
}

