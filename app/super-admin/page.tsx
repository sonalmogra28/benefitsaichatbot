'use client';

import { SuperAdminDashboard } from '@/components/super-admin/super-admin-dashboard';
import { useEffect, useState } from 'react';

export default function SuperAdminPage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/super-admin/analytics');
        if (response.ok) {
          const data = await response.json();
          setDashboardData(data);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!dashboardData) {
    return <div>Could not load dashboard data.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <SuperAdminDashboard
        stats={dashboardData}
        analytics={dashboardData.analytics}
        topQuestions={dashboardData.topQuestions}
        costBreakdown={dashboardData.costBreakdown}
      />
    </div>
  );
}
