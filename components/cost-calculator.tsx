import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp, Activity, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CostCalculatorProps {
  plans?: Array<{
    name: string;
    type: string;
    monthlyPremium: number;
    deductible: number;
    outOfPocketMax: number;
    coinsurance: number;
    copayPrimary?: number;
    copaySpecialist?: number;
    copayER?: number;
    copayUrgent?: number;
  }>;
}

export function CostCalculator({ plans = [], assumptions }: CostCalculatorProps & { assumptions?: any }) {
  const [doctorVisits, setDoctorVisits] = useState([5]);
  const [specialistVisits, setSpecialistVisits] = useState([2]);
  const [urgentCareVisits, setUrgentCareVisits] = useState([1]);
  const [prescriptions, setPrescriptions] = useState([10]);
  const [hospitalDays, setHospitalDays] = useState([0]);

  // Default plans if none provided
  const defaultPlans = plans.length > 0 ? plans : [
    {
      name: "Basic HMO",
      type: "HMO",
      monthlyPremium: 350,
      deductible: 2500,
      outOfPocketMax: 7000,
      coinsurance: 20,
      copayPrimary: 30,
      copaySpecialist: 60,
      copayER: 350,
      copayUrgent: 75
    },
    {
      name: "Enhanced PPO",
      type: "PPO",
      monthlyPremium: 550,
      deductible: 1000,
      outOfPocketMax: 5000,
      coinsurance: 15,
      copayPrimary: 20,
      copaySpecialist: 40,
      copayER: 250,
      copayUrgent: 50
    },
    {
      name: "High Deductible HSA",
      type: "HDHP",
      monthlyPremium: 250,
      deductible: 4000,
      outOfPocketMax: 8000,
      coinsurance: 20,
      copayPrimary: 0,
      copaySpecialist: 0,
      copayER: 0,
      copayUrgent: 0
    }
  ];

  // Default assumptions if none provided
  const defaultAssumptions = assumptions || {
    averagePrimaryCost: 150,
    averageSpecialistCost: 300,
    averageERCost: 2000,
    averageUrgentCost: 200,
    averageGenericRx: 75
  };

  const calculateAnnualCost = (plan: typeof defaultPlans[0]) => {
    const annualPremium = plan.monthlyPremium * 12;
    
    // Calculate medical costs
    let medicalCosts = 0;
    
    // For HDHP, everything applies to deductible first
    if (plan.type === 'HDHP') {
      const totalServiceCost = 
        (doctorVisits[0] * defaultAssumptions.averagePrimaryCost) + 
        (specialistVisits[0] * defaultAssumptions.averageSpecialistCost) + 
        (urgentCareVisits[0] * defaultAssumptions.averageUrgentCost) + 
        (prescriptions[0] * defaultAssumptions.averageGenericRx) +
        (hospitalDays[0] * 3000);
      
      if (totalServiceCost <= plan.deductible) {
        medicalCosts = totalServiceCost;
      } else {
        medicalCosts = plan.deductible + ((totalServiceCost - plan.deductible) * (plan.coinsurance / 100));
      }
    } else {
      // For other plans, copays apply
      medicalCosts = 
        (doctorVisits[0] * (plan.copayPrimary || 0)) +
        (specialistVisits[0] * (plan.copaySpecialist || 0)) +
        (urgentCareVisits[0] * (plan.copayUrgent || 0)) +
        (prescriptions[0] * 30) + // Generic prescription copay
        (hospitalDays[0] * 500); // Daily hospital copay after deductible
    }
    
    // Cap at out-of-pocket maximum
    const totalOutOfPocket = Math.min(medicalCosts, plan.outOfPocketMax);
    
    return {
      premium: annualPremium,
      medical: Math.round(totalOutOfPocket),
      total: annualPremium + Math.round(totalOutOfPocket),
      hsaSavings: plan.type === 'HDHP' ? Math.round(3850 * 0.25) : 0 // Tax savings on HSA
    };
  };

  const getUsageLevel = () => {
    const totalVisits = doctorVisits[0] + specialistVisits[0] + urgentCareVisits[0] + hospitalDays[0];
    if (totalVisits < 5) return { level: 'Low', color: 'text-green-600 bg-green-50' };
    if (totalVisits < 15) return { level: 'Moderate', color: 'text-yellow-600 bg-yellow-50' };
    return { level: 'High', color: 'text-red-600 bg-red-50' };
  };

  const usage = getUsageLevel();
  const planCosts = defaultPlans.map(plan => ({
    ...plan,
    costs: calculateAnnualCost(plan)
  }));
  
  const lowestCostPlan = planCosts.reduce((min, plan) => 
    (plan.costs.total - plan.costs.hsaSavings) < (min.costs.total - min.costs.hsaSavings) ? plan : min
  );

  return (
    <TooltipProvider>
      <div className="space-y-4 w-full">
        {/* Usage Input Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calculator className="size-5" />
                Healthcare Usage Estimator
              </span>
              <Badge className={usage.color}>
                {usage.level} Usage
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6">
              <div>
                <Label className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-2">
                    Primary Doctor Visits
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="size-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Annual checkups, sick visits, follow-ups</p>
                      </TooltipContent>
                    </Tooltip>
                  </span>
                  <span className="font-bold text-lg">{doctorVisits[0]}</span>
                </Label>
                <Slider
                  value={doctorVisits}
                  onValueChange={setDoctorVisits}
                  max={20}
                  step={1}
                  className="cursor-pointer"
                />
              </div>
              
              <div>
                <Label className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-2">
                    Specialist Visits
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="size-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Dermatologist, cardiologist, etc.</p>
                      </TooltipContent>
                    </Tooltip>
                  </span>
                  <span className="font-bold text-lg">{specialistVisits[0]}</span>
                </Label>
                <Slider
                  value={specialistVisits}
                  onValueChange={setSpecialistVisits}
                  max={15}
                  step={1}
                  className="cursor-pointer"
                />
              </div>
              
              <div>
                <Label className="flex items-center justify-between mb-3">
                  <span>Urgent Care Visits</span>
                  <span className="font-bold text-lg">{urgentCareVisits[0]}</span>
                </Label>
                <Slider
                  value={urgentCareVisits}
                  onValueChange={setUrgentCareVisits}
                  max={10}
                  step={1}
                  className="cursor-pointer"
                />
              </div>
              
              <div>
                <Label className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-2">
                    Prescriptions per Year
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="size-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Monthly medications × 12</p>
                      </TooltipContent>
                    </Tooltip>
                  </span>
                  <span className="font-bold text-lg">{prescriptions[0]}</span>
                </Label>
                <Slider
                  value={prescriptions}
                  onValueChange={setPrescriptions}
                  max={50}
                  step={1}
                  className="cursor-pointer"
                />
              </div>
              
              <div>
                <Label className="flex items-center justify-between mb-3">
                  <span>Hospital Days</span>
                  <span className="font-bold text-lg">{hospitalDays[0]}</span>
                </Label>
                <Slider
                  value={hospitalDays}
                  onValueChange={setHospitalDays}
                  max={10}
                  step={1}
                  className="cursor-pointer"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cost Comparison Results */}
        <div className="space-y-3">
          {planCosts.map((plan, index) => {
            const isLowest = plan.name === lowestCostPlan.name;
            const effectiveTotal = plan.costs.total - plan.costs.hsaSavings;
            
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={isLowest ? 'ring-2 ring-green-500 shadow-lg' : ''}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{plan.name}</h3>
                        <Badge variant="outline" className="mt-1">{plan.type}</Badge>
                      </div>
                      {isLowest && (
                        <Badge className="bg-green-500 text-white">
                          <TrendingUp className="size-4 mr-1" />
                          Best Value
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Annual Premium</div>
                        <div className="font-bold text-lg">${plan.costs.premium.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Est. Medical Costs</div>
                        <div className="font-bold text-lg">${plan.costs.medical.toLocaleString()}</div>
                      </div>
                      {plan.type === 'HDHP' && (
                        <div>
                          <div className="text-sm text-muted-foreground">HSA Tax Savings</div>
                          <div className="font-bold text-lg text-green-600">-${plan.costs.hsaSavings.toLocaleString()}</div>
                        </div>
                      )}
                      <div className={plan.type === 'HDHP' ? '' : 'col-span-2 md:col-span-1'}>
                        <div className="text-sm text-muted-foreground">Total Annual Cost</div>
                        <div className="font-bold text-xl">${effectiveTotal.toLocaleString()}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Recommendations */}
        <Card className="bg-blue-50/50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Activity className="size-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">Recommendation based on your usage:</p>
                <p className="text-blue-700">
                  {usage.level === 'Low' 
                    ? "With low expected usage, the High Deductible HSA plan offers the best value through lower premiums and tax advantages."
                    : usage.level === 'Moderate'
                    ? "With moderate usage, consider the PPO plan for balanced coverage and reasonable out-of-pocket costs."
                    : "With high expected usage, the PPO plan's lower deductible and out-of-pocket maximum provide better financial protection."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}