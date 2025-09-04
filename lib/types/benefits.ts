export interface BenefitsPlan {
  name: string;
  type: 'HMO' | 'PPO' | 'HDHP';
  monthlyPremium: number;
  deductible: number;
  outOfPocketMax: number;
  features: string[];
}

export interface CostBreakdown {
  premium: number;
  outOfPocket: number;
  total: number;
}

export interface BenefitsSummary {
  healthPlan: {
    name: string;
    type: string;
    monthlyPremium: number;
    deductibleTotal: number;
    deductibleUsed: number;
    outOfPocketMax: number;
    outOfPocketUsed: number;
  };
  dentalPlan: {
    name: string;
    monthlyPremium: number;
    annualMax: number;
    annualUsed: number;
  };
  visionPlan: {
    name: string;
    monthlyPremium: number;
    lastExam: string;
  };
  totalMonthlyPremium: number;
  upcomingDeadlines: Array<{
    task: string;
    date: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface CostEstimate {
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

export interface QuickAction {
  icon: React.ReactNode;
  label: string;
  prompt: string;
}
