'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Building2,
  Heart,
  Shield,
  Plus,
  Download,
  Upload,
  Settings,
  BarChart3,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { EmployeeList } from './employee-list';
import { DocumentUpload } from './document-upload';
import { BenefitsManagement } from './benefits-management';

interface CompanyDashboardProps {
  companyName: string;
  companyId?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function CompanyDashboard({
  companyName,
  companyId,
}: CompanyDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const { data: stats, error: statsError } = useSWR(
    companyId ? `/api/company-admin/stats?companyId=${companyId}` : null,
    fetcher,
  );

  const { data: recentActivity, error: recentActivityError } = useSWR(
    companyId ? `/api/company-admin/activity?companyId=${companyId}` : null,
    fetcher,
  );

  if (!stats || !recentActivity) {
    return <div>Loading...</div>;
  }

  const utilizationPercentage = stats.utilisationRate * 100;
  const enrollmentRate =
    stats.employees > 0 ? (stats.activeEnrollments / stats.employees) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="size-8" />
            {companyName} Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your company&apos;s benefits, employees, and analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="size-4 mr-2" />
            Export Data
          </Button>
          <Button size="sm">
            <Settings className="size-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.employees}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeEnrollments} with active benefits
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Enrollment Rate
            </CardTitle>
            <Heart className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {enrollmentRate.toFixed(1)}%
            </div>
            <Progress value={enrollmentRate} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
            <Shield className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePlans}</div>
            <p className="text-xs text-muted-foreground">
              Available for enrollment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Cost</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalCost.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Total benefits spend
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="benefits">Benefits</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="size-5" />
                  Quick Actions
                </CardTitle>
                <CardDescription>Common administrative tasks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Plus className="size-4 mr-2" />
                  Add New Employee
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Upload className="size-4 mr-2" />
                  Upload Benefits Document
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Heart className="size-4 mr-2" />
                  Create Benefit Plan
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <BarChart3 className="size-4 mr-2" />
                  View Enrollment Report
                </Button>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="size-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest updates in your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivity.slice(0, 5).map((activity: any) => (
                    <div key={activity.id} className="flex items-center gap-3">
                      <div className="shrink-0">
                        {activity.status === 'success' && (
                          <CheckCircle className="size-4 text-green-500" />
                        )}
                        {activity.status === 'pending' && (
                          <Clock className="size-4 text-yellow-500" />
                        )}
                        {activity.status === 'failed' && (
                          <AlertCircle className="size-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.timestamp), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Utilization Insights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="size-5" />
                Benefits Utilization
              </CardTitle>
              <CardDescription>
                How your employees are using their benefits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">
                      Overall Utilization
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {utilizationPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={utilizationPercentage} className="h-3" />
                </div>

                <div className="grid gap-4 md:grid-cols-3 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {Math.round(stats.activeEnrollments * 0.7)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Health Insurance
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round(stats.activeEnrollments * 0.4)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Dental Coverage
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round(stats.activeEnrollments * 0.2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Vision Coverage
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          {companyId ? (
            <EmployeeList companyId={companyId} companyName={companyName} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">
                  Company ID not available
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="benefits" className="space-y-4">
          {companyId ? (
            <BenefitsManagement
              companyId={companyId}
              companyName={companyName}
            />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">
                  Company ID not available
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {companyId ? (
            <div className="space-y-4">
              <DocumentUpload companyId={companyId} />
              <div className="text-muted-foreground text-sm">
                Visit the Documents page to view and manage all documents.
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">
                  Company ID not available
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics & Reporting</CardTitle>
              <CardDescription>
                Insights into benefits usage and costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="size-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Analytics Dashboard Coming Soon
                </h3>
                <p className="text-muted-foreground mb-4">
                  Detailed reports on enrollment trends, cost analysis, and
                  employee engagement.
                </p>
                <Button>
                  <BarChart3 className="size-4 mr-2" />
                  View Reports
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
