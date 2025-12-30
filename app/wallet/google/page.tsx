"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";

export default function GoogleWalletPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [googleWalletUrl, setGoogleWalletUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGoogleWalletUrl = async () => {
      try {
        const response = await fetch('/api/google-wallet/create');
        if (!response.ok) {
          throw new Error('Failed to create Google Wallet pass');
        }
        const data = await response.json();
        if (data.addToWalletUrl) {
          setGoogleWalletUrl(data.addToWalletUrl);
          // Open Google Wallet in the same window
          window.location.href = data.addToWalletUrl;
        } else {
          throw new Error('No Google Wallet URL received');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to create Google Wallet pass');
      }
    };

    fetchGoogleWalletUrl();
  }, []);

  if (error) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-red-600">Error</CardTitle>
              <CardDescription>
                {error}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => router.push("/join")}
                className="w-full"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="w-16 h-16 text-amber-600 animate-spin" />
            </div>
            <CardTitle className="text-2xl">Opening Google Wallet</CardTitle>
            <CardDescription>
              Redirecting you to add your loyalty card...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                If you're not redirected automatically, click the button below.
              </p>
              {googleWalletUrl && (
                <Button
                  onClick={() => window.location.href = googleWalletUrl}
                  className="w-full mt-4"
                  size="lg"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Google Wallet
                </Button>
              )}
            </div>
            <div className="pt-4 border-t">
              <Button 
                onClick={() => router.push("/wallet-success?type=google")}
                variant="outline"
                className="w-full"
              >
                I've Added My Card - Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

