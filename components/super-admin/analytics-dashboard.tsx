'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Building2,
  Users,
  FileText,
  MessageSquare,
  HardDrive,
  TrendingUp,
  DollarSign,
  Activity,
} from 'lucide-react';
import { formatBytes } from '@/lib/utils';
import type { SystemAnalytics } from '@/lib/types/super-admin';

interface AnalyticsDashboardProps {
  analytics: SystemAnalytics;
}

export function AnalyticsDashboard({ analytics }: AnalyticsDashboardProps) {
  const storagePercentage = (analytics.storage.used / analytics.storage.total) * 100;

  return (
    <div className="grid gap-4">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalCompanies}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.activeCompanies} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.activeUsers.monthly} MAU
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Chats</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.usage.totalChats}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.usage.averageChatsPerUser} avg per user
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.usage.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Across all companies
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Users & Storage */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Active Users
            </CardTitle>
            <CardDescription>User activity across different time periods</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Daily Active Users</span>
                <span className="text-sm text-muted-foreground">
                  {analytics.activeUsers.daily}
                </span>
              </div>
              <Progress
                value={(analytics.activeUsers.daily / analytics.totalUsers) * 100}
                className="h-2"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Weekly Active Users</span>
                <span className="text-sm text-muted-foreground">
                  {analytics.activeUsers.weekly}
                </span>
              </div>
              <Progress
                value={(analytics.activeUsers.weekly / analytics.totalUsers) * 100}
                className="h-2"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Monthly Active Users</span>
                <span className="text-sm text-muted-foreground">
                  {analytics.activeUsers.monthly}
                </span>
              </div>
              <Progress
                value={(analytics.activeUsers.monthly / analytics.totalUsers) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage Usage
            </CardTitle>
            <CardDescription>
              {formatBytes(analytics.storage.used)} of {formatBytes(analytics.storage.total)} used
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Progress value={storagePercentage} className="h-4" />
                <p className="text-xs text-muted-foreground mt-1">
                  {storagePercentage.toFixed(1)}% used
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Top Companies by Storage</h4>
                {analytics.storage.byCompany.slice(0, 5).map((company) => (
                  <div key={company.companyId} className="flex items-center justify-between">
                    <span className="text-sm truncate flex-1">{company.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatBytes(company.used)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Metrics
          </CardTitle>
          <CardDescription>Monthly and annual revenue breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Monthly Recurring Revenue</p>
              <p className="text-2xl font-bold">${analytics.revenue.mrr.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Annual Recurring Revenue</p>
              <p className="text-2xl font-bold">${analytics.revenue.arr.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Churn Rate</p>
              <p className="text-2xl font-bold">{analytics.revenue.churnRate}%</p>
            </div>
          </div>
          
          {analytics.revenue.byPlan.length > 0 && (
            <div className="mt-6 space-y-2">
              <h4 className="text-sm font-medium">Revenue by Plan</h4>
              {analytics.revenue.byPlan.map((plan) => (
                <div key={plan.plan} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{plan.plan}</span>
                  <div className="text-right">
                    <span className="text-sm font-medium">
                      ${plan.revenue.toLocaleString()}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      ({plan.count} companies)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage Patterns
          </CardTitle>
          <CardDescription>Platform usage statistics and trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium mb-2">Content Statistics</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Messages</span>
                  <span className="text-sm font-medium">
                    {analytics.usage.totalMessages.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Avg Messages per Chat</span>
                  <span className="text-sm font-medium">
                    {analytics.usage.totalChats > 0
                      ? Math.round(analytics.usage.totalMessages / analytics.usage.totalChats)
                      : 0}
                  </span>
                </div>
              </div>
            </div>
            
            {analytics.usage.peakHours.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Peak Usage Hours</h4>
                <div className="space-y-1">
                  {analytics.usage.peakHours.slice(0, 3).map((hour) => (
                    <div key={hour.hour} className="flex justify-between">
                      <span className="text-sm">{hour.hour}:00</span>
                      <span className="text-sm font-medium">{hour.count} requests</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}