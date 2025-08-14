import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign } from 'lucide-react';

interface PlanCost {
  name: string;
  premium: number;
  deductible: number;
  outOfPocketMax: number;
  estimatedCost: number;
}

export function CostCalculator() {
  const [doctorVisits, setDoctorVisits] = useState(0);
  const [prescriptions, setPrescriptions] = useState(0);
  const [hospitalStays, setHospitalStays] = useState(0);
  const [planCosts, setPlanCosts] = useState<PlanCost[]>([]);

  const calculateCosts = () => {
    // This is a simplified calculation. In a real application, this logic
    // would be much more complex and would likely be handled by the backend.
    const plans = [
      { name: 'PPO Plan', premium: 4800, deductible: 1000, outOfPocketMax: 5000 },
      { name: 'HMO Plan', premium: 3600, deductible: 2000, outOfPocketMax: 7000 },
      { name: 'HDHP Plan', premium: 2400, deductible: 5000, outOfPocketMax: 8000 },
    ];

    const estimatedMedicalCosts =
      doctorVisits * 150 + prescriptions * 50 + hospitalStays * 5000;

    const calculatedCosts = plans.map((plan) => {
      const costsAfterPremium = Math.min(
        estimatedMedicalCosts,
        plan.outOfPocketMax,
      );
      const totalCost = plan.premium + costsAfterPremium;
      return { ...plan, estimatedCost: totalCost };
    });

    setPlanCosts(calculatedCosts);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-4"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="size-5" />
            Benefits Cost Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="doctor-visits">Doctor Visits</Label>
              <Input
                id="doctor-visits"
                type="number"
                value={doctorVisits}
                onChange={(e) => setDoctorVisits(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="prescriptions">Prescriptions</Label>
              <Input
                id="prescriptions"
                type="number"
                value={prescriptions}
                onChange={(e) => setPrescriptions(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="hospital-stays">Hospital Stays</Label>
              <Input
                id="hospital-stays"
                type="number"
                value={hospitalStays}
                onChange={(e) => setHospitalStays(Number(e.target.value))}
              />
            </div>
          </div>
          <Button onClick={calculateCosts}>Calculate Costs</Button>
        </CardContent>
      </Card>

      {planCosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Estimated Annual Costs</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead className="text-right">Estimated Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planCosts.map((plan) => (
                  <TableRow key={plan.name}>
                    <TableCell>{plan.name}</TableCell>
                    <TableCell className="text-right">
                      ${plan.estimatedCost.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
