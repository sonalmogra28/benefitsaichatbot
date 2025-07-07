'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { CheckCircle, DollarSign, Shield, TrendingUp, TrendingDown, Star } from 'lucide-react';

interface PlanComparisonData {
  planType: string;
  plans: Array<{
    name: string;
    type: string;
    monthlyPremium: number;
    annualPremium: number;
    deductible: number;
    maxOutOfPocket: number;
    copayPrimaryDoc?: number;
    copaySpecialist?: number;
    copayEmergencyRoom?: number;
    coinsurance?: number;
    prescriptionCoverage?: string;
    networkSize?: 'small' | 'medium' | 'large';
    specialFeatures?: string[];
    estimatedAnnualCost: number;
    totalMaxCost: number;
    valueScore: number;
    isRecommended: boolean;
  }>;
  summary: {
    lowestPremium: number;
    highestPremium: number;
    averagePremium: number;
    lowestDeductible: number;
    highestDeductible: number;
    potentialSavings: number;
  };
  recommendations: Array<{
    planName: string;
    reason: string;
    estimatedAnnualSavings: number;
  }>;
}

function AnimatedNumber({ value, prefix = '', suffix = '', duration = 2000 }: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const increment = end / (duration / 16);
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value, duration]);

  return (
    <span className="tabular-nums">
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
}

function PlanCard({ plan, index, isHighlighted, onSelect }: {
  plan: PlanComparisonData['plans'][0];
  index: number;
  isHighlighted: boolean;
  onSelect: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  const networkSizeLabels = {
    small: { label: 'Small Network', color: 'bg-red-100 text-red-800' },
    medium: { label: 'Medium Network', color: 'bg-yellow-100 text-yellow-800' },
    large: { label: 'Large Network', color: 'bg-green-100 text-green-800' },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.1, duration: 0.6, ease: 'easeOut' }}
      whileHover={{ scale: 1.02, y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onSelect}
      className={cn(
        'relative transition-all duration-300 cursor-pointer',
        isHighlighted && 'ring-2 ring-blue-500 ring-offset-2'
      )}
    >
      <Card className={cn(
        'h-full transition-all duration-300',
        isHighlighted && 'border-blue-500 shadow-lg shadow-blue-500/20',
        isHovered && 'shadow-xl'
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              {plan.isRecommended && (
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                >
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    <Star className="size-3 mr-1" />
                    Recommended
                  </Badge>
                </motion.div>
              )}
            </div>
            <Badge variant="outline" className="text-xs">
              {plan.type}
            </Badge>
          </div>
          <CardDescription className="text-sm">
            {plan.networkSize && (
              <Badge 
                variant="secondary" 
                className={cn('text-xs', networkSizeLabels[plan.networkSize].color)}
              >
                {networkSizeLabels[plan.networkSize].label}
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Monthly Premium */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="size-4 text-green-600" />
              <span className="text-sm font-medium">Monthly Premium</span>
            </div>
            <div className="text-lg font-bold text-green-600">
              <AnimatedNumber value={plan.monthlyPremium} prefix="$" />
            </div>
          </div>

          {/* Annual Cost Estimate */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-blue-600" />
              <span className="text-sm font-medium">Est. Annual Cost</span>
            </div>
            <div className="text-lg font-bold text-blue-600">
              <AnimatedNumber value={plan.estimatedAnnualCost} prefix="$" />
            </div>
          </div>

          <Separator />

          {/* Key Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Deductible</span>
              <div className="font-semibold">
                <AnimatedNumber value={plan.deductible} prefix="$" />
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Max Out-of-Pocket</span>
              <div className="font-semibold">
                <AnimatedNumber value={plan.maxOutOfPocket} prefix="$" />
              </div>
            </div>
          </div>

          {/* Copays */}
          {(plan.copayPrimaryDoc || plan.copaySpecialist || plan.copayEmergencyRoom) && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Copays</div>
              <div className="grid grid-cols-1 gap-1 text-xs">
                {plan.copayPrimaryDoc && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Primary Doctor</span>
                    <span className="font-medium">${plan.copayPrimaryDoc}</span>
                  </div>
                )}
                {plan.copaySpecialist && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Specialist</span>
                    <span className="font-medium">${plan.copaySpecialist}</span>
                  </div>
                )}
                {plan.copayEmergencyRoom && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Emergency Room</span>
                    <span className="font-medium">${plan.copayEmergencyRoom}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Special Features */}
          {plan.specialFeatures && plan.specialFeatures.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Special Features</div>
              <div className="flex flex-wrap gap-1">
                {plan.specialFeatures.map((feature, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Value Score */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <Shield className="size-4 text-purple-600" />
              <span className="text-sm font-medium">Value Score</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold text-purple-600">
                <AnimatedNumber value={plan.valueScore} suffix="%" />
              </div>
              <div className="text-xs text-muted-foreground">
                (lower is better)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function PlanComparison({ data }: { data: PlanComparisonData }) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-6xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.h2 
          className="text-2xl font-bold text-gray-900"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {data.planType === 'health' ? 'Health Insurance' : 
           data.planType === 'dental' ? 'Dental Insurance' :
           data.planType === 'vision' ? 'Vision Insurance' : 'Retirement'} Plan Comparison
        </motion.h2>
        <motion.p 
          className="text-muted-foreground"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          Compare plans side-by-side to find your best option
        </motion.p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Premium Range</div>
                  <div className="text-lg font-bold">
                    <AnimatedNumber value={data.summary.lowestPremium} prefix="$" /> - <AnimatedNumber value={data.summary.highestPremium} prefix="$" />
                  </div>
                </div>
                <DollarSign className="size-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Potential Savings</div>
                  <div className="text-lg font-bold text-green-600">
                    <AnimatedNumber value={data.summary.potentialSavings} prefix="$" />
                  </div>
                </div>
                <TrendingDown className="size-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Deductible Range</div>
                  <div className="text-lg font-bold">
                    <AnimatedNumber value={data.summary.lowestDeductible} prefix="$" /> - <AnimatedNumber value={data.summary.highestDeductible} prefix="$" />
                  </div>
                </div>
                <Shield className="size-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Plan Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {data.plans.map((plan, index) => (
          <PlanCard
            key={plan.name}
            plan={plan}
            index={index}
            isHighlighted={selectedPlan === plan.name}
            onSelect={() => setSelectedPlan(selectedPlan === plan.name ? null : plan.name)}
          />
        ))}
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="size-5 text-green-600" />
                Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.recommendations.map((rec, index) => (
                  <motion.div
                    key={rec.planName}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + index * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200"
                  >
                    <div className="shrink-0 size-2 bg-green-500 rounded-full mt-2" />
                    <div className="flex-1">
                      <div className="font-semibold text-green-800">{rec.planName}</div>
                      <div className="text-sm text-green-700">{rec.reason}</div>
                      {rec.estimatedAnnualSavings > 0 && (
                        <div className="text-sm font-medium text-green-600 mt-1">
                          Save up to <AnimatedNumber value={rec.estimatedAnnualSavings} prefix="$" /> annually
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}