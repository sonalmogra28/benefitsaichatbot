'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Users,
  FileText,
  BarChart3,
  Activity,
  DollarSign,
  Clock,
} from 'lucide-react';
import { AnalyticsDashboard } from './analytics-dashboard';
import Link from 'next/link';
import type { SuperAdminStats } from '@/types/api';

interface DashboardStats extends SuperAdminStats {
  activeChats: number;
  monthlyGrowth: number;
  systemHealth: 'healthy' | 'degraded' | 'down';
  apiUsage: number;
  storageUsed: number;
}

export function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalDocuments: 0,
    totalBenefitPlans: 0,
    activeEnrollments: 0,
    activeChats: 0,
    monthlyGrowth: 0,
    systemHealth: 'healthy',
    apiUsage: 0,
    storageUsed: 0,
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    // TODO: Fetch actual stats from Firebase
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      // Get the user's auth token
      const auth = (await import('firebase/auth')).getAuth();
      const user = auth.currentUser;

      if (!user) {
        console.error('No authenticated user');
        return;
      }

      const token = await user.getIdToken();

      // Fetch dashboard stats from API
      const statsResponse = await fetch('/api/super-admin/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (statsResponse.ok) {
        const statsData = (await statsResponse.json()) as SuperAdminStats;
        setStats((prev) => ({ ...prev, ...statsData }));
      } else {
        console.error('Failed to fetch stats:', statsResponse.statusText);
        // Set default values on error
        setStats({
          totalUsers: 0,
          totalDocuments: 0,
          totalBenefitPlans: 0,
          activeEnrollments: 0,
          activeChats: 0,
          monthlyGrowth: 0,
          systemHealth: 'degraded',
          apiUsage: 0,
          storageUsed: 0,
        });
      }

      // Fetch recent activity
      const activityResponse = await fetch(
        '/api/super-admin/activity?limit=5',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setRecentActivity(
          activityData.map((activity: any) => ({
            ...activity,
            timestamp: new Date(activity.timestamp),
          })),
        );
      } else {
        console.error('Failed to fetch activity:', activityResponse.statusText);
        setRecentActivity([]);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Set default values on error
      setStats({
        totalUsers: 0,
        totalDocuments: 0,
        totalBenefitPlans: 0,
        activeEnrollments: 0,
        activeChats: 0,
        monthlyGrowth: 0,
        systemHealth: 'degraded',
        apiUsage: 0,
        storageUsed: 0,
      });
      setRecentActivity([]);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'text-green-600';
      case 'degraded':
        return 'text-yellow-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const handleExportAnalytics = () => {
    window.location.href = '/api/super-admin/export';
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Benefit Plans</CardTitle>
            <Building2 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBenefitPlans}</div>
            <p className="text-xs text-muted-foreground">Available plans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Across all companies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Chats</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeChats}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold capitalize ${getHealthColor(stats.systemHealth)}`}
            >
              {stats.systemHealth}
            </div>
            <p className="text-xs text-muted-foreground">
              All services operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Usage</CardTitle>
            <BarChart3 className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.apiUsage.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Calls this month</p>
            <div className="mt-3 h-2 bg-gray-200 rounded">
              <div
                className="h-2 bg-blue-600 rounded"
                style={{ width: '65%' }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              65% of monthly limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.storageUsed} GB</div>
            <p className="text-xs text-muted-foreground">Of 100 GB total</p>
            <div className="mt-3 h-2 bg-gray-200 rounded">
              <div
                className="h-2 bg-green-600 rounded"
                style={{ width: '32%' }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">32% capacity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$2,451</div>
            <p className="text-xs text-muted-foreground">Projected: $2,800</p>
            <div className="mt-3">
              <p className="text-xs text-green-600">↓ 12% from last month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity and Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest platform events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="shrink-0">
                  <Clock className="size-4 text-muted-foreground mt-1" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTimeAgo(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            <Link href="/super-admin/analytics" className="block">
              <Button variant="outline" className="w-full mt-2">
                View All Activity
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/super-admin/companies/new" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Building2 className="mr-2 size-4" />
                Add New Company
              </Button>
            </Link>
            <Link href="/super-admin/users/new" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 size-4" />
                Create Admin User
              </Button>
            </Link>
            <Link href="/super-admin/documents" className="block">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 size-4" />
                Manage Documents
              </Button>
            </Link>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleExportAnalytics}
            >
              <BarChart3 className="mr-2 size-4" />
              Export Analytics
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Section */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Analytics</CardTitle>
          <CardDescription>Usage trends and insights</CardDescription>
        </CardHeader>
        <CardContent>
          <AnalyticsDashboard />
        </CardContent>
      </Card>
    </div>
  );
}
