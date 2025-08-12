// app/company-admin/settings/integrations/page.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function IntegrationsPage() {
  const router = useRouter();

  const handleConnect = () => {
    router.push('/api/auth/google');
  };

  const handleSync = async () => {
    await fetch('/api/company-admin/integrations/google/sync', {
      method: 'POST',
    });
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Integrations</h1>
      <div className="border rounded-lg p-6">
        <h2 className="text-xl font-semibold">Google Workspace</h2>
        <p className="text-muted-foreground mb-4">
          Sync your employees from Google Workspace.
        </p>
        <div className="flex gap-4">
          <Button onClick={handleConnect}>Connect</Button>
          <Button onClick={handleSync} variant="outline">
            Sync
          </Button>
        </div>
      </div>
    </div>
  );
}
