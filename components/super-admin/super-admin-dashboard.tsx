'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Building2,
  Users,
  DollarSign,
  Activity,
  TrendingUp,
  Shield,
  Server,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  Settings,
  Download,
  Upload,
  Plus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AnalyticsDashboard } from '@/components/admin/analytics-dashboard';

interface SuperAdminDashboardProps {
  stats: {
    totalCompanies: number;
    totalUsers: number;
    totalPlans: number;
    activeEnrollments: number;
    recentCompanies: Array<{
      id: string;
      name: string;
      domain: string;
      subscriptionTier: string;
      createdAt: Date;
    }>;
  };
  analytics?: any;
  topQuestions?: any[];
  costBreakdown?: any;
}

export function SuperAdminDashboard({ 
  stats, 
  analytics,
  topQuestions = [],
  costBreakdown = { daily: [], byUser: [] }
}: SuperAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate platform health metrics
  const platformHealth = {
    uptime: 99.98,
    responseTime: 245, // ms
    errorRate: 0.02,
    activeUsers: Math.round(stats.totalUsers * 0.75), // Mock active users
  };

  // Calculate revenue metrics (mock data)
  const revenueMetrics = {
    mrr: stats.totalCompanies * 2500, // Avg $2500/company
    arr: stats.totalCompanies * 2500 * 12,
    growth: 15.5, // % month over month
    churn: 2.3, // %
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Platform Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage the entire Benefits AI platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Platform Settings
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanies}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {platformHealth.activeUsers.toLocaleString()} active today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${revenueMetrics.mrr.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{revenueMetrics.growth}%</span> growth
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platformHealth.uptime}%</div>
            <p className="text-xs text-muted-foreground">
              {platformHealth.responseTime}ms avg response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlans}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeEnrollments} enrollments
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Companies */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Companies</CardTitle>
                <CardDescription>Latest organizations to join the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.recentCompanies.map((company) => (
                    <div key={company.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <p className="text-sm text-muted-foreground">{company.domain}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{company.subscriptionTier}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(company.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {stats.recentCompanies.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No companies yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>Platform health and performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">API Uptime</span>
                    <span className="text-sm text-muted-foreground">{platformHealth.uptime}%</span>
                  </div>
                  <Progress value={platformHealth.uptime} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Database Performance</span>
                    <span className="text-sm text-muted-foreground">Optimal</span>
                  </div>
                  <Progress value={95} className="h-2" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Storage Usage</span>
                    <span className="text-sm text-muted-foreground">45.2 GB / 100 GB</span>
                  </div>
                  <Progress value={45.2} className="h-2" />
                </div>

                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      API Services
                    </span>
                    <span className="text-green-600">Operational</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Vector Database
                    </span>
                    <span className="text-green-600">Operational</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                      Email Service
                    </span>
                    <span className="text-yellow-600">High Volume</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Platform Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Activity</CardTitle>
              <CardDescription>Real-time platform usage and engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {Math.round(stats.totalUsers * 0.15)}
                  </div>
                  <p className="text-sm text-muted-foreground">Active Now</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {Math.round(stats.totalUsers * 0.75)}
                  </div>
                  <p className="text-sm text-muted-foreground">Daily Active</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {Math.round(stats.totalUsers * 0.85)}
                  </div>
                  <p className="text-sm text-muted-foreground">Weekly Active</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {Math.round(stats.totalUsers * 0.95)}
                  </div>
                  <p className="text-sm text-muted-foreground">Monthly Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="companies" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Company Management</CardTitle>
                  <CardDescription>Manage all companies on the platform</CardDescription>
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Company
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Company Management Interface</h3>
                <p className="text-muted-foreground mb-4">
                  Full company CRUD operations, subscription management, and tenant configuration
                </p>
                <Button variant="outline">View All Companies</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>Cross-tenant user administration</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Import
                  </Button>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">User Management Interface</h3>
                <p className="text-muted-foreground mb-4">
                  Search across all tenants, manage roles, and monitor user activity
                </p>
                <Button variant="outline">View All Users</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analytics ? (
            <AnalyticsDashboard 
              analytics={analytics}
              topQuestions={topQuestions}
              costBreakdown={costBreakdown}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analytics Dashboard</h3>
                <p className="text-muted-foreground">
                  Comprehensive platform analytics and insights coming soon
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Infrastructure Status */}
            <Card>
              <CardHeader>
                <CardTitle>Infrastructure Status</CardTitle>
                <CardDescription>Core system components health</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Database Cluster</span>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Healthy
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Redis Cache</span>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Healthy
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Vector Database</span>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Healthy
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">Background Jobs</span>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    12 Pending
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* System Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>System Metrics</CardTitle>
                <CardDescription>Real-time performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CPU Usage</span>
                    <span className="font-medium">42%</span>
                  </div>
                  <Progress value={42} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Memory Usage</span>
                    <span className="font-medium">68%</span>
                  </div>
                  <Progress value={68} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>API Response Time</span>
                    <span className="font-medium">{platformHealth.responseTime}ms</span>
                  </div>
                  <Progress value={Math.min((500 - platformHealth.responseTime) / 5, 100)} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Error Rate</span>
                    <span className="font-medium">{platformHealth.errorRate}%</span>
                  </div>
                  <Progress value={100 - platformHealth.errorRate} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${revenueMetrics.mrr.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+{revenueMetrics.growth}%</span> from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Annual Recurring Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${revenueMetrics.arr.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Projected annual revenue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Revenue per Account</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$2,500</div>
                <p className="text-xs text-muted-foreground">Per company per month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{revenueMetrics.churn}%</div>
                <p className="text-xs text-muted-foreground">Monthly churn rate</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by Subscription Tier</CardTitle>
              <CardDescription>Monthly revenue breakdown by plan type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Enterprise</span>
                    <span className="text-sm text-muted-foreground">$75,000 (60%)</span>
                  </div>
                  <Progress value={60} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Professional</span>
                    <span className="text-sm text-muted-foreground">$37,500 (30%)</span>
                  </div>
                  <Progress value={30} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Starter</span>
                    <span className="text-sm text-muted-foreground">$12,500 (10%)</span>
                  </div>
                  <Progress value={10} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}