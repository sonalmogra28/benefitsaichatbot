'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { format } from 'date-fns';
import { 
  DollarSign, 
  MessageSquare, 
  Users, 
  Clock,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AnalyticsDashboardProps {
  analytics: any;
  topQuestions: any[];
  costBreakdown: any;
}

export default function AnalyticsDashboard({ analytics, topQuestions, costBreakdown }: AnalyticsDashboardProps) {
  // Calculate percentage changes
  const feedbackScore = analytics.totalMessages > 0 
    ? ((analytics.positiveFeedback / (analytics.positiveFeedback + analytics.negativeFeedback + analytics.neutralFeedback)) * 100).toFixed(1)
    : '0';

  // Format data for charts
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    messages: analytics.messagesByHour.find((h: any) => h.hour === i)?.count || 0,
  }));

  const toolUsageData = Object.entries(analytics.toolUsageCount).map(([tool, count]) => ({
    name: tool,
    value: count,
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Chat Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Monitor usage, performance, and costs of your AI assistant
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalConversations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.avgMessagesPerConversation.toFixed(1)} messages per conversation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.uniqueUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Unique users in the last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(analytics.avgResponseTime / 1000).toFixed(2)}s</div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              ${analytics.avgCostPerConversation.toFixed(3)} per conversation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction Score</CardTitle>
            <ThumbsUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feedbackScore}%</div>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1">
                <ThumbsUp className="size-3 text-green-500" />
                {analytics.positiveFeedback}
              </span>
              <span className="flex items-center gap-1">
                <ThumbsDown className="size-3 text-red-500" />
                {analytics.negativeFeedback}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertCircle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.errorRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              Of all messages resulted in errors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Tokens</CardTitle>
            <Zap className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(analytics.avgTokensPerResponse)}</div>
            <p className="text-xs text-muted-foreground">
              Tokens per response
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Usage Patterns</TabsTrigger>
          <TabsTrigger value="questions">Top Questions</TabsTrigger>
          <TabsTrigger value="tools">Tool Usage</TabsTrigger>
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Messages by Hour</CardTitle>
              <CardDescription>
                When users are most active throughout the day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="messages" fill="#0088FE" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily Message Volume</CardTitle>
              <CardDescription>
                Message trends over the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.messagesByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date: string) => format(new Date(date), 'MMM d')}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(date: string) => format(new Date(date), 'MMM d, yyyy')}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Common Questions</CardTitle>
              <CardDescription>
                Top questions asked by employees in the last 30 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topQuestions.map((question, index) => (
                  <div key={`${question.question}-${index}`} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{index + 1}. {question.question}</p>
                    </div>
                    <Badge variant="secondary">{question.count} times</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tool Usage Distribution</CardTitle>
              <CardDescription>
                Which tools are being used most frequently
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={toolUsageData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => {
                      const { name, percent } = props;
                      if (!name || percent === undefined) return '';
                      return `${name} ${(percent * 100).toFixed(0)}%`;
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {toolUsageData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Cost Trend</CardTitle>
              <CardDescription>
                AI usage costs over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={costBreakdown.daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date: string) => format(new Date(date), 'MMM d')}
                  />
                  <YAxis tickFormatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Tooltip 
                    labelFormatter={(date: string) => format(new Date(date), 'MMM d, yyyy')}
                    formatter={(value: any) => `$${value.toFixed(2)}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="#00C49F" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Users by Cost</CardTitle>
              <CardDescription>
                Users generating the highest AI costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {costBreakdown.byUser.slice(0, 10).map((user: any, index: number) => (
                  <div key={`${user.userEmail}-${index}`} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{user.userEmail || 'Unknown User'}</p>
                    </div>
                    <Badge variant="outline">${user.cost.toFixed(2)}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}