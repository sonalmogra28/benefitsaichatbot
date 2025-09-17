/**
 * Analytics Dashboard Component
 * Displays usage analytics and insights for admin users
 */

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
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  MessageSquare,
  Users,
  FileText,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  DollarSign,
  Eye,
  Download,
} from 'lucide-react';

interface AnalyticsData {
  totalMessages: number;
  totalUsers: number;
  totalDocuments: number;
  averageResponseTime: number;
  totalCost: number;
  monthlyTrend: Array<{
    month: string;
    messages: number;
    users: number;
    cost: number;
  }>;
  planComparisons: Array<{
    plan: string;
    comparisons: number;
    cost: number;
  }>;
  userEngagement: Array<{
    day: string;
    activeUsers: number;
    messages: number;
  }>;
  documentTypes: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

interface AnalyticsDashboardProps {
  tenantId: string;
  companyName?: string;
}

export function AnalyticsDashboard({
  tenantId,
  companyName = 'Amerivet',
}: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data - would be replaced with real API calls
  useEffect(() => {
    const mockData: AnalyticsData = {
      totalMessages: 1247,
      totalUsers: 89,
      totalDocuments: 23,
      averageResponseTime: 1.2,
      totalCost: 234.50,
      monthlyTrend: [
        { month: 'Jan', messages: 120, users: 45, cost: 45.20 },
        { month: 'Feb', messages: 180, users: 52, cost: 67.80 },
        { month: 'Mar', messages: 220, users: 61, cost: 82.40 },
        { month: 'Apr', messages: 195, users: 58, cost: 73.60 },
        { month: 'May', messages: 280, users: 67, cost: 105.20 },
        { month: 'Jun', messages: 320, users: 72, cost: 120.80 },
        { month: 'Jul', messages: 290, users: 75, cost: 109.40 },
        { month: 'Aug', messages: 350, users: 82, cost: 132.00 },
        { month: 'Sep', messages: 380, users: 89, cost: 143.20 },
        { month: 'Oct', messages: 420, users: 95, cost: 158.40 },
        { month: 'Nov', messages: 390, users: 91, cost: 147.20 },
        { month: 'Dec', messages: 450, users: 98, cost: 169.80 },
      ],
      planComparisons: [
        { plan: 'BCBSTX Standard HSA', comparisons: 45, cost: 86.84 },
        { plan: 'BCBSTX Enhanced HSA', comparisons: 32, cost: 160.36 },
        { plan: 'BCBSTX PPO', comparisons: 28, cost: 267.42 },
        { plan: 'Kaiser Standard HMO', comparisons: 15, cost: 196.30 },
        { plan: 'Kaiser Enhanced HMO', comparisons: 12, cost: 379.26 },
      ],
      userEngagement: [
        { day: 'Mon', activeUsers: 45, messages: 89 },
        { day: 'Tue', activeUsers: 52, messages: 102 },
        { day: 'Wed', activeUsers: 48, messages: 95 },
        { day: 'Thu', activeUsers: 55, messages: 108 },
        { day: 'Fri', activeUsers: 42, messages: 78 },
        { day: 'Sat', activeUsers: 18, messages: 32 },
        { day: 'Sun', activeUsers: 12, messages: 21 },
      ],
      documentTypes: [
        { type: 'Benefits Summary', count: 8, percentage: 35 },
        { type: 'Enrollment Guide', count: 6, percentage: 26 },
        { type: 'Policy Documents', count: 5, percentage: 22 },
        { type: 'FAQ', count: 4, percentage: 17 },
      ],
    };

    setTimeout(() => {
      setData(mockData);
      setLoading(false);
    }, 1000);
  }, [tenantId, timeRange]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="size-8 animate-spin text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="size-6" />
            Analytics Dashboard
          </h2>
          <p className="text-muted-foreground">
            Usage insights and performance metrics for {companyName}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="size-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalMessages.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="size-3 inline mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="size-3 inline mr-1" />
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="size-3 inline mr-1" />
              +3 this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.averageResponseTime}s</div>
            <p className="text-xs text-muted-foreground">
              <TrendingDown className="size-3 inline mr-1" />
              -0.3s from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage Trends</TabsTrigger>
          <TabsTrigger value="plans">Plan Comparisons</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Usage Trend</CardTitle>
                <CardDescription>Messages and users over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="messages" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="users" stroke="#82ca9d" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Weekly Engagement</CardTitle>
                <CardDescription>Daily active users and messages</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.userEngagement}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="activeUsers" fill="#8884d8" />
                    <Bar dataKey="messages" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Analytics</CardTitle>
              <CardDescription>Detailed usage patterns and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{data.totalMessages}</div>
                  <p className="text-sm text-muted-foreground">Total Messages</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{data.totalUsers}</div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">${data.totalCost.toFixed(2)}</div>
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Plan Comparison Usage</CardTitle>
              <CardDescription>Most compared benefit plans</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.planComparisons} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="plan" type="category" width={200} />
                  <Tooltip />
                  <Bar dataKey="comparisons" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Document Types</CardTitle>
                <CardDescription>Distribution of uploaded documents</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.documentTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.documentTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Document Statistics</CardTitle>
                <CardDescription>Document processing and usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.documentTypes.map((doc, index) => (
                    <div key={doc.type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium">{doc.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{doc.count}</Badge>
                        <span className="text-sm text-muted-foreground">{doc.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}