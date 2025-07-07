import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { Calculator, DollarSign, TrendingDown, Stethoscope, Building2, Pill, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

interface CostEstimate {
  monthlyPremium: number;
  annualPremium: number;
  estimatedOutOfPocket: number;
  totalEstimatedCost: number;
  breakdown: {
    doctorVisits: number;
    hospitalDays: number;
    prescriptions: number;
    surgeries: number;
  };
  savings?: {
    compared_to: string;
    amount: number;
    percentage: number;
  };
}

interface Plan {
  name: string;
  type: string;
  premium: number;
  deductible: number;
  maxOOP: number;
  copays: {
    doctor: number;
    specialist: number;
    hospital: number;
    prescription: number;
  };
}

const availablePlans: Plan[] = [
  {
    name: 'BasicCare HMO',
    type: 'HMO',
    premium: 350,
    deductible: 1500,
    maxOOP: 3000,
    copays: { doctor: 25, specialist: 50, hospital: 150, prescription: 15 }
  },
  {
    name: 'Choice PPO',
    type: 'PPO',
    premium: 550,
    deductible: 1000,
    maxOOP: 5000,
    copays: { doctor: 30, specialist: 60, hospital: 200, prescription: 20 }
  },
  {
    name: 'HSA High Deductible',
    type: 'HDHP',
    premium: 250,
    deductible: 3000,
    maxOOP: 6000,
    copays: { doctor: 0, specialist: 0, hospital: 0, prescription: 0 }
  }
];

export function CostCalculator() {
  const [selectedPlan, setSelectedPlan] = useState('');
  const [familySize, setFamilySize] = useState('1');
  const [doctorVisits, setDoctorVisits] = useState([6]);
  const [hospitalDays, setHospitalDays] = useState([0]);
  const [prescriptions, setPrescriptions] = useState([2]);
  const [expectedSurgeries, setExpectedSurgeries] = useState([0]);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);

  const calculateCosts = useCallback(() => {
    if (!selectedPlan) return null;
    
    const plan = availablePlans.find(p => p.name === selectedPlan);
    if (!plan) return null;
    
    const familyMultiplier = Number.parseInt(familySize);
    const monthlyPremium = plan.premium * familyMultiplier;
    const annualPremium = monthlyPremium * 12;
    
    // Calculate estimated costs based on usage
    const doctorCosts = doctorVisits[0] * plan.copays.doctor;
    const hospitalCosts = hospitalDays[0] * plan.copays.hospital * 24; // per day
    const prescriptionCosts = prescriptions[0] * plan.copays.prescription * 12; // monthly
    const surgeryCosts = expectedSurgeries[0] * 2500; // average surgery cost after insurance
    
    const totalMedicalCosts = doctorCosts + hospitalCosts + prescriptionCosts + surgeryCosts;
    
    // Apply deductible and out-of-pocket max
    let outOfPocketCosts = 0;
    if (totalMedicalCosts > plan.deductible) {
      outOfPocketCosts = Math.min(totalMedicalCosts, plan.maxOOP);
    } else {
      outOfPocketCosts = Math.min(totalMedicalCosts, plan.deductible);
    }
    
    const totalEstimatedCost = annualPremium + outOfPocketCosts;
    
    // Calculate savings compared to most expensive plan
    const mostExpensivePlan = availablePlans.reduce((prev, current) => 
      (prev.premium > current.premium) ? prev : current
    );
    const mostExpensiveTotal = (mostExpensivePlan.premium * familyMultiplier * 12) + outOfPocketCosts;
    const savings = mostExpensiveTotal - totalEstimatedCost;
    
    return {
      monthlyPremium,
      annualPremium,
      estimatedOutOfPocket: outOfPocketCosts,
      totalEstimatedCost,
      breakdown: {
        doctorVisits: doctorCosts,
        hospitalDays: hospitalCosts,
        prescriptions: prescriptionCosts,
        surgeries: surgeryCosts
      },
      savings: savings > 0 && plan.name !== mostExpensivePlan.name ? {
        compared_to: mostExpensivePlan.name,
        amount: Math.round(savings),
        percentage: Math.round((savings / mostExpensiveTotal) * 100)
      } : undefined
    };
  }, [selectedPlan, familySize, doctorVisits, hospitalDays, prescriptions, expectedSurgeries]);

  useEffect(() => {
    const newEstimate = calculateCosts();
    setEstimate(newEstimate);
  }, [selectedPlan, familySize, doctorVisits, hospitalDays, prescriptions, expectedSurgeries, calculateCosts]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-4 w-full max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="size-5 text-blue-500" />
              Interactive Benefits Cost Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Plan and Family Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="planType">Health Plan</Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a health plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlans.map((plan) => (
                      <SelectItem key={plan.name} value={plan.name}>
                        {plan.name} - {formatCurrency(plan.premium)}/month
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="familySize">Coverage Type</Label>
                <Select value={familySize} onValueChange={setFamilySize}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Individual</SelectItem>
                    <SelectItem value="2">Employee + Spouse</SelectItem>
                    <SelectItem value="3">Employee + Children</SelectItem>
                    <SelectItem value="4">Family (4+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Interactive Sliders */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Expected Annual Usage</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Stethoscope className="size-4 text-blue-500" />
                      Doctor Visits
                    </Label>
                    <span className="text-sm font-medium">{doctorVisits[0]} visits</span>
                  </div>
                  <Slider
                    value={doctorVisits}
                    onValueChange={setDoctorVisits}
                    max={20}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>20+</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Building2 className="size-4 text-red-500" />
                      Hospital Days
                    </Label>
                    <span className="text-sm font-medium">{hospitalDays[0]} days</span>
                  </div>
                  <Slider
                    value={hospitalDays}
                    onValueChange={setHospitalDays}
                    max={10}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>10+</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Pill className="size-4 text-green-500" />
                      Monthly Prescriptions
                    </Label>
                    <span className="text-sm font-medium">{prescriptions[0]} per month</span>
                  </div>
                  <Slider
                    value={prescriptions}
                    onValueChange={setPrescriptions}
                    max={10}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>10+</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Heart className="size-4 text-purple-500" />
                      Expected Surgeries
                    </Label>
                    <span className="text-sm font-medium">{expectedSurgeries[0]} procedures</span>
                  </div>
                  <Slider
                    value={expectedSurgeries}
                    onValueChange={setExpectedSurgeries}
                    max={3}
                    min={0}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>3+</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Real-time Cost Display */}
      {estimate && selectedPlan && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="size-5 text-green-500" />
                Cost Breakdown for {selectedPlan}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Main Cost Display */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Monthly Premium</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrency(estimate.monthlyPremium)}
                  </div>
                </div>
                
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Est. Out-of-Pocket</div>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(estimate.estimatedOutOfPocket)}
                  </div>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-lg border-2 border-green-200">
                  <div className="text-sm text-muted-foreground">Total Annual Cost</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(estimate.totalEstimatedCost)}
                  </div>
                </div>
              </div>
              
              {/* Usage Breakdown */}
              <div className="mt-6">
                <h4 className="text-sm font-medium mb-3">Cost Breakdown by Service</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span>Doctor Visits:</span>
                    <span className="font-medium">{formatCurrency(estimate.breakdown.doctorVisits)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span>Hospital Days:</span>
                    <span className="font-medium">{formatCurrency(estimate.breakdown.hospitalDays)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span>Prescriptions:</span>
                    <span className="font-medium">{formatCurrency(estimate.breakdown.prescriptions)}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span>Surgeries:</span>
                    <span className="font-medium">{formatCurrency(estimate.breakdown.surgeries)}</span>
                  </div>
                </div>
              </div>
              
              {/* Savings Display */}
              {estimate.savings && (
                <div className="flex items-center justify-center gap-2 p-4 bg-green-100 rounded-lg">
                  <TrendingDown className="size-5 text-green-600" />
                  <span className="text-green-700 font-medium">
                    Save {formatCurrency(estimate.savings.amount)} ({estimate.savings.percentage}%) vs {estimate.savings.compared_to}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Plan Comparison Hint */}
      {!selectedPlan && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center p-6 border-2 border-dashed border-gray-200 rounded-lg"
        >
          <Calculator className="size-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">Select a health plan above to see real-time cost calculations</p>
        </motion.div>
      )}
    </div>
  );
}