'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestGoogleWalletPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const createPass = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/google-wallet/create');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to create pass');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Test Google Wallet Pass Creation</CardTitle>
          <CardDescription>
            Click the button below to create a Google Wallet pass for your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={createPass} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Creating Pass...' : 'Create Google Wallet Pass'}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="font-semibold text-red-800 mb-2">Error</h3>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md space-y-4">
              <h3 className="font-semibold text-green-800 mb-2">Success!</h3>
              
              {result.addToWalletUrl && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Add to Wallet URL:</p>
                  <a 
                    href={result.addToWalletUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all"
                  >
                    {result.addToWalletUrl}
                  </a>
                  <div className="mt-4">
                    <Button 
                      onClick={() => window.open(result.addToWalletUrl, '_blank')}
                      className="w-full"
                    >
                      Open in Google Wallet
                    </Button>
                  </div>
                </div>
              )}

              <div className="text-sm space-y-1">
                <p><strong>Pass ID:</strong> {result.passId}</p>
                <p><strong>Class ID:</strong> {result.classId}</p>
                <p><strong>Object Exists:</strong> {result.objectExists ? 'Yes' : 'No'}</p>
                {result.instructions && (
                  <p className="text-gray-600 mt-2">{result.instructions}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

