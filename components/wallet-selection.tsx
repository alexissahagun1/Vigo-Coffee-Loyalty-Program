"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface WalletSelectionProps {
  userId: string;
  onClose?: () => void;
}

export function WalletSelection({ userId, onClose }: WalletSelectionProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [googleWalletUrl, setGoogleWalletUrl] = useState<string | null>(null);

  // Detect device type
  const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = typeof window !== 'undefined' && /Android/.test(navigator.userAgent);
  const isMobile = isIOS || isAndroid;

  // Determine primary and secondary wallet
  const primaryWallet = isIOS ? 'apple' : isAndroid ? 'google' : 'apple'; // Default to Apple for web
  const secondaryWallet = primaryWallet === 'apple' ? 'google' : 'apple';

  // Fetch Google Wallet link when component mounts
  useEffect(() => {
    const fetchGoogleWalletLink = async () => {
      try {
        const response = await fetch('/api/google-wallet/create');
        if (response.ok) {
          const data = await response.json();
          if (data.addToWalletUrl) {
            setGoogleWalletUrl(data.addToWalletUrl);
          }
        }
      } catch (err) {
        console.log('Google Wallet not available');
      }
    };

    fetchGoogleWalletLink();
  }, []);

  const handleAppleWallet = () => {
    setIsLoading('apple');
    setError(null);
    window.location.href = '/api/wallet';
  };

  const handleGoogleWallet = async () => {
    setIsLoading('google');
    setError(null);

    try {
      if (googleWalletUrl) {
        window.location.href = googleWalletUrl;
      } else {
        const response = await fetch('/api/google-wallet/create');
        if (!response.ok) {
          throw new Error('Failed to create Google Wallet pass');
        }
        const data = await response.json();
        if (data.addToWalletUrl) {
          window.location.href = data.addToWalletUrl;
        } else {
          throw new Error('No Google Wallet URL received');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add to Google Wallet');
      setIsLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Add to Wallet</CardTitle>
        <CardDescription>
          {isIOS 
            ? "Add your loyalty card to Apple Wallet" 
            : isAndroid 
            ? "Add your loyalty card to Google Wallet"
            : "Choose your preferred wallet"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          {/* Primary Wallet Button (Device Native) */}
          {primaryWallet === 'apple' ? (
            <button
              onClick={handleAppleWallet}
              disabled={isLoading !== null}
              className="w-full bg-black text-white rounded-xl px-6 py-5 flex items-center justify-center gap-3 font-semibold text-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
              style={{
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {isLoading === 'apple' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-7 h-7"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <span>Add to Apple Wallet</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleGoogleWallet}
              disabled={isLoading !== null}
              className="w-full bg-white border-2 border-gray-200 rounded-xl px-6 py-5 flex items-center justify-center gap-3 font-semibold text-lg hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
            >
              {isLoading === 'google' ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-900 border-t-transparent"></div>
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-7 h-7"
                    viewBox="0 0 24 24"
                  >
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span className="text-gray-900">Add to Google Wallet</span>
                </>
              )}
            </button>
          )}

          {/* Divider with "or" */}
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="px-4 text-sm text-gray-500 bg-white">or</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* Secondary Wallet Button (Alternative) */}
          {secondaryWallet === 'apple' ? (
            <button
              onClick={handleAppleWallet}
              disabled={isLoading !== null}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-3 flex items-center justify-center gap-2 font-medium text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading === 'apple' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent"></div>
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  <span>Add to Apple Wallet</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleGoogleWallet}
              disabled={isLoading !== null}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-3 flex items-center justify-center gap-2 font-medium text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading === 'google' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent"></div>
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                  >
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Add to Google Wallet</span>
                </>
              )}
            </button>
          )}
        </div>

        {onClose && (
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full mt-4"
            disabled={isLoading !== null}
          >
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
