// app/company-admin/settings/integrations/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function IntegrationsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = () => {
    // Redirect to Google OAuth flow
    const googleAuthUrl = `/api/auth/google?redirect_uri=${encodeURIComponent('/company-admin/settings/integrations')}`;
    router.push(googleAuthUrl);
  };

  const handleSync = async () => {
    setIsLoading(true);
    try {
      // Get access token from localStorage or session
      const accessToken = localStorage.getItem('google_access_token');
      const companyId = localStorage.getItem('companyId');
      
      if (!accessToken || !companyId) {
        toast({
          title: 'Authentication Required',
          description: 'Please connect to Google Workspace first.',
          variant: 'destructive'
        });
        return;
      }

      const response = await fetch('/api/company-admin/integrations/google/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          accessToken
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: 'Sync Successful',
          description: result.message || `Synced ${result.syncedCount} users from Google Workspace.`,
        });
        setIsConnected(true);
      } else {
        throw new Error(result.error || 'Sync failed');
      }
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Failed to sync with Google Workspace.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Integrations</h1>
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold">Google Workspace</h2>
        <p className="text-muted-foreground mb-4">
          Sync your employees from Google Workspace to automatically manage user accounts.
        </p>
        <div className="flex gap-4">
          <Button 
            onClick={handleConnect}
            disabled={isConnected}
          >
            {isConnected ? 'Connected' : 'Connect'}
          </Button>
          <Button 
            onClick={handleSync} 
            variant="outline"
            disabled={!isConnected || isLoading}
          >
            {isLoading ? 'Syncing...' : 'Sync Users'}
          </Button>
        </div>
        {isConnected && (
          <p className="text-sm text-green-600 mt-2">
            ✓ Google Workspace is connected and ready to sync
          </p>
        )}
      </div>
    </div>
  );
}
