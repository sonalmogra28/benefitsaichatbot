import { motion } from 'framer-motion';
import { Check, TrendingUp, Shield, Heart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Plan {
  name: string;
  type: string;
  monthlyPremium: number;
  deductible: number;
  outOfPocketMax: number;
  features: string[];
}

interface PlanComparisonProps {
  plans: Plan[];
}

export function PlanComparison({ plans }: PlanComparisonProps) {
  const getPlanIcon = (type: string) => {
    switch(type) {
      case 'HMO': return <Shield className="size-5" />;
      case 'PPO': return <Heart className="size-5" />;
      case 'HDHP': return <TrendingUp className="size-5" />;
      default: return <Shield className="size-5" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
      {plans.map((plan, index) => (
        <motion.div
          key={plan.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
            {plan.type === 'PPO' && (
              <Badge className="absolute top-4 right-4" variant="default">
                Most Popular
              </Badge>
            )}
            
            <CardHeader>
              <div className="flex items-center gap-2">
                {getPlanIcon(plan.type)}
                <CardTitle>{plan.name}</CardTitle>
              </div>
              <CardDescription>{plan.type} Plan</CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Monthly Premium</span>
                  <span className="text-2xl font-bold">{formatCurrency(plan.monthlyPremium)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Deductible</span>
                  <span className="font-semibold">{formatCurrency(plan.deductible)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Out-of-Pocket Max</span>
                  <span className="font-semibold">{formatCurrency(plan.outOfPocketMax)}</span>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">Key Features</p>
                <ul className="space-y-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="size-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-primary text-primary-foreground rounded-md py-2 font-medium hover:bg-primary/90 transition-colors"
              >
                Select This Plan
              </motion.button>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}