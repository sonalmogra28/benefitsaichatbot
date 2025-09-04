import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from './ui/button';

interface Plan {
  id: string;
  name: string;
  premium: number;
  deductible: number;
  outOfPocketMax: number;
  type: string;
  category: string;
  provider: string;
}

export function PlanComparison() {
  const [allPlans, setAllPlans] = useState<Plan[]>([]);
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<Plan[]>([]);

  useEffect(() => {
    // In a real application, you would fetch these plans from an API
    const mockPlans: Plan[] = [
      {
        id: '1',
        name: 'Gold PPO',
        premium: 500,
        deductible: 1000,
        outOfPocketMax: 5000,
        type: 'health',
        category: 'PPO',
        provider: 'Blue Cross',
      },
      {
        id: '2',
        name: 'Silver HMO',
        premium: 350,
        deductible: 2500,
        outOfPocketMax: 7000,
        type: 'health',
        category: 'HMO',
        provider: 'Kaiser',
      },
      {
        id: '3',
        name: 'Bronze HDHP',
        premium: 250,
        deductible: 5000,
        outOfPocketMax: 8000,
        type: 'health',
        category: 'HDHP',
        provider: 'Aetna',
      },
      {
        id: '4',
        name: 'Vision Basic',
        premium: 20,
        deductible: 50,
        outOfPocketMax: 200,
        type: 'vision',
        category: 'PPO',
        provider: 'VSP',
      },
      {
        id: '5',
        name: 'Dental Premier',
        premium: 45,
        deductible: 100,
        outOfPocketMax: 1500,
        type: 'dental',
        category: 'PPO',
        provider: 'Delta Dental',
      },
    ];
    setAllPlans(mockPlans);
  }, []);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanIds((prev) =>
      prev.includes(planId)
        ? prev.filter((id) => id !== planId)
        : [...prev, planId],
    );
  };

  const comparePlans = () => {
    setComparison(allPlans.filter((plan) => selectedPlanIds.includes(plan.id)));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-4"
    >
      <Card>
        <CardHeader>
          <CardTitle>Select Plans to Compare</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {allPlans.map((plan) => (
              <div key={plan.id} className="flex items-center space-x-2">
                <Checkbox
                  id={plan.id}
                  checked={selectedPlanIds.includes(plan.id)}
                  onCheckedChange={() => handleSelectPlan(plan.id)}
                />
                <label htmlFor={plan.id}>{plan.name}</label>
              </div>
            ))}
          </div>
          <Button onClick={comparePlans} disabled={selectedPlanIds.length < 2}>
            Compare Selected
          </Button>
        </CardContent>
      </Card>
      {comparison.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Plan Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  {comparison.map((plan) => (
                    <TableHead key={plan.id}>{plan.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Premium</TableCell>
                  {comparison.map((plan) => (
                    <TableCell key={plan.id}>${plan.premium}/mo</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Deductible</TableCell>
                  {comparison.map((plan) => (
                    <TableCell key={plan.id}>${plan.deductible}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Out-of-Pocket Max</TableCell>
                  {comparison.map((plan) => (
                    <TableCell key={plan.id}>${plan.outOfPocketMax}</TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Type</TableCell>
                  {comparison.map((plan) => (
                    <TableCell key={plan.id}>
                      <Badge>{plan.type}</Badge>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Category</TableCell>
                  {comparison.map((plan) => (
                    <TableCell key={plan.id}>
                      <Badge variant="secondary">{plan.category}</Badge>
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell>Provider</TableCell>
                  {comparison.map((plan) => (
                    <TableCell key={plan.id}>{plan.provider}</TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
