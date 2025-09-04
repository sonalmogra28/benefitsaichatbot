'use client';

import { motion } from 'framer-motion';
import {
  Shield,
  Heart,
  Eye,
  Users,
  PiggyBank,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import type { BenefitsSummary } from '@/types/api';

export function BenefitsDashboard() {
  const [summary, setSummary] = useState<BenefitsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const response = await fetch('/api/employee/benefits');
        if (response.ok) {
          const data = await response.json();
          setSummary(data);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, []);

  if (loading) {
    return <BenefitsDashboardSkeleton />;
  }

  if (!summary) {
    return <div>Could not load benefits summary.</div>;
  }

  const getCoverageIcon = (type: string) => {
    const icons: Record<string, JSX.Element> = {
      Medical: <Heart className="size-5" />,
      Dental: <Shield className="size-5" />,
      Vision: <Eye className="size-5" />,
      Life: <Users className="size-5" />,
      '401k': <PiggyBank className="size-5" />,
      HSA: <TrendingUp className="size-5" />,
    };
    return icons[type] || <Shield className="size-5" />;
  };

  const healthPlan = summary.healthPlan || {
    name: 'Select a Plan',
    type: 'N/A',
    deductibleUsed: 0,
    deductibleTotal: 1,
    outOfPocketUsed: 0,
    outOfPocketMax: 1,
    premiumPaid: 0,
    premiumTotal: 1,
  };

  const deductibleProgress =
    (healthPlan.deductibleUsed / healthPlan.deductibleTotal) * 100;
  const oopProgress =
    (healthPlan.outOfPocketUsed / healthPlan.outOfPocketMax) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-4"
    >
      {/* Current Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Heart className="size-5 text-red-500" />
              {healthPlan.name}
            </span>
            <Badge variant="secondary">{healthPlan.type}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Deductible Progress</span>
              <span className="font-medium">
                ${healthPlan.deductibleUsed.toLocaleString()} / $
                {healthPlan.deductibleTotal.toLocaleString()}
              </span>
            </div>
            <Progress value={deductibleProgress} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Out-of-Pocket Maximum</span>
              <span className="font-medium">
                ${healthPlan.outOfPocketUsed.toLocaleString()} / $
                {healthPlan.outOfPocketMax.toLocaleString()}
              </span>
            </div>
            <Progress value={oopProgress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Coverage Grid */}
      {summary.coverageTypes && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {summary.coverageTypes.map((coverage, index) => (
            <motion.div
              key={coverage.type}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={`${coverage.status === 'active' ? 'border-green-500 bg-green-50/50' : 'border-gray-300'}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getCoverageIcon(coverage.type)}
                      <span className="font-medium">{coverage.type}</span>
                    </div>
                    {coverage.status === 'active' && (
                      <Badge variant="default" className="bg-green-500 text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  {coverage.status === 'active' && (
                    <div className="text-sm text-muted-foreground">
                      ${coverage.monthlyPremium}/mo
                      {coverage.coverageLevel && (
                        <div className="text-xs mt-1">
                          {coverage.coverageLevel}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upcoming Deadlines */}
      {summary.upcomingDeadlines && summary.upcomingDeadlines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="size-5" />
              Important Dates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.upcomingDeadlines.map((deadline) => (
                <div
                  key={deadline.event}
                  className="flex justify-between items-center py-2 border-b last:border-0"
                >
                  <div>
                    <div className="font-medium">{deadline.event}</div>
                    <div className="text-sm text-muted-foreground">
                      {deadline.date}
                    </div>
                  </div>
                  <Badge
                    variant={
                      deadline.daysRemaining <= 7 ? 'destructive' : 'secondary'
                    }
                    className="ml-2"
                  >
                    {deadline.daysRemaining} days
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Savings Opportunity */}
      {summary.savingsOpportunity && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-blue-500 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <TrendingUp className="size-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-blue-900">
                    Potential Savings: $
                    {summary.savingsOpportunity.amount.toLocaleString()}/year
                  </div>
                  <div className="text-sm text-blue-700 mt-1">
                    {summary.savingsOpportunity.recommendation}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

function BenefitsDashboardSkeleton() {
  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-3/4" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-2 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-2 w-full" />
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {['skeleton-1', 'skeleton-2', 'skeleton-3'].map((key) => (
          <Card key={key}>
            <CardContent className="p-4">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
