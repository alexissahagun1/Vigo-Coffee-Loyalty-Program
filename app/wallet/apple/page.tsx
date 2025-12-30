"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function AppleWalletPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Generate and download the pass
    const generatePass = async () => {
      try {
        const response = await fetch("/api/wallet");
        
        if (!response.ok) {
          throw new Error("Failed to generate pass");
        }

        // Get the pass file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "loyalty-card.pkpass";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        // Wait a moment for the download to start, then show success
        setTimeout(() => {
          setStatus("success");
        }, 1000);
      } catch (err: any) {
        setError(err.message || "Failed to generate pass");
        setStatus("error");
      }
    };

    generatePass();
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Loader2 className="w-16 h-16 text-amber-600 animate-spin" />
              </div>
              <CardTitle className="text-2xl">Generating Your Pass</CardTitle>
              <CardDescription>
                Please wait while we create your loyalty card...
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-red-600">Error</CardTitle>
              <CardDescription>
                {error || "Something went wrong"}
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
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Pass Downloaded!</CardTitle>
            <CardDescription>
              Your loyalty card pass has been downloaded
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Tap the downloaded file to add it to your Apple Wallet, or find it in your Downloads folder.
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                💡 Tip: Make sure to enable automatic updates in your Apple Wallet settings 
                to keep your points balance up to date.
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-4">
              <Button 
                onClick={() => router.push("/wallet-success?type=apple")}
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

