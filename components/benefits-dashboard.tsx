import { motion } from 'framer-motion';
import { Shield, Heart, Eye, Briefcase, PiggyBank, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface BenefitsSummary {
  healthPlan: {
    name: string;
    deductibleUsed: number;
    deductibleTotal: number;
    outOfPocketUsed: number;
    outOfPocketMax: number;
  };
  coverageTypes: Array<{
    type: string;
    status: 'active' | 'not-enrolled';
    monthlyPremium: number;
  }>;
  upcomingDeadlines: Array<{
    event: string;
    date: string;
    daysRemaining: number;
  }>;
}

export function BenefitsDashboard({ summary }: { summary: BenefitsSummary }) {
  const getCoverageIcon = (type: string) => {
    const icons: Record<string, JSX.Element> = {
      'Medical': <Heart className="size-5" />,
      'Dental': <Shield className="size-5" />,
      'Vision': <Eye className="size-5" />,
      'Life': <Users className="size-5" />,
      '401k': <PiggyBank className="size-5" />,
      'Disability': <Briefcase className="size-5" />
    };
    return icons[type] || <Shield className="size-5" />;
  };

  const deductibleProgress = (summary.healthPlan.deductibleUsed / summary.healthPlan.deductibleTotal) * 100;
  const oopProgress = (summary.healthPlan.outOfPocketUsed / summary.healthPlan.outOfPocketMax) * 100;

  return (
    <div className="space-y-4 w-full">
      {/* Current Plan Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="size-5 text-red-500" />
              {summary.healthPlan.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Deductible</span>
                <span>${summary.healthPlan.deductibleUsed} / ${summary.healthPlan.deductibleTotal}</span>
              </div>
              <Progress value={deductibleProgress} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Out-of-Pocket Maximum</span>
                <span>${summary.healthPlan.outOfPocketUsed} / ${summary.healthPlan.outOfPocketMax}</span>
              </div>
              <Progress value={oopProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Coverage Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {summary.coverageTypes.map((coverage, index) => (
          <motion.div
            key={coverage.type}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className={`${coverage.status === 'active' ? 'border-green-500' : 'border-gray-300'}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getCoverageIcon(coverage.type)}
                    <span className="font-medium">{coverage.type}</span>
                  </div>
                  {coverage.status === 'active' && (
                    <div className="text-xs text-green-600 font-medium">Active</div>
                  )}
                </div>
                {coverage.status === 'active' && (
                  <div className="text-sm text-muted-foreground mt-1">
                    ${coverage.monthlyPremium}/mo
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Upcoming Deadlines */}
      {summary.upcomingDeadlines.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Deadlines</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.upcomingDeadlines.map((deadline, idx) => (
                <div key={`${deadline.event}-${idx}`} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <div className="font-medium">{deadline.event}</div>
                    <div className="text-sm text-muted-foreground">{deadline.date}</div>
                  </div>
                  <div className={`text-sm font-medium ${deadline.daysRemaining <= 7 ? 'text-red-500' : 'text-green-500'}`}>
                    {deadline.daysRemaining} days
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}