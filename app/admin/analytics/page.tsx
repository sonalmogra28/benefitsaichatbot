'use client';

import { useState, useEffect } from 'react';
import { AnalyticsDashboard } from '@/components/super-admin/analytics-dashboard';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/toast';
import { RefreshCw, Download } from 'lucide-react';
import type { SystemAnalytics } from '@/lib/types/super-admin';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<SystemAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/super-admin/analytics');
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      toast({
        type: 'error',
        description: 'Failed to load analytics',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleExport = async () => {
    try {
      const response = await fetch('/api/super-admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          includeTypes: ['companies', 'users', 'documents', 'chats'],
          format: 'json',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `platform-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        type: 'success',
        description: 'Platform data has been exported successfully.',
      });
    } catch (error) {
      toast({
        type: 'error',
        description: 'Failed to export data',
      });
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Platform Analytics</h1>
          <p className="text-muted-foreground">Platform-wide usage analytics and insights</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchAnalytics}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {loading && !analytics ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading analytics...
        </div>
      ) : analytics ? (
        <AnalyticsDashboard analytics={analytics} />
      ) : (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Failed to load analytics. Please try again.
        </div>
      )}
    </div>
  );
}