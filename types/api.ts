export interface BenefitsSummary {
  healthPlan?: {
    name: string;
    type: string;
    deductibleUsed: number;
    deductibleTotal: number;
    outOfPocketUsed: number;
    outOfPocketMax: number;
    premiumPaid?: number;
    premiumTotal?: number;
  };
  coverageTypes?: Array<{
    type: string;
    status: 'active' | 'not-enrolled';
    monthlyPremium: number;
    coverageLevel?: string;
  }>;
  upcomingDeadlines?: Array<{
    event: string;
    date: string;
    daysRemaining: number;
  }>;
  savingsOpportunity?: {
    amount: number;
    recommendation: string;
  };
}

export interface SuperAdminStats {
  totalUsers: number;
  totalDocuments: number;
  totalBenefitPlans: number;
  activeEnrollments: number;
}
