export interface BenefitPlan {
  id: string;
  name: string;
  type:
    | 'health'
    | 'dental'
    | 'vision'
    | 'life'
    | 'disability'
    | '401k'
    | 'hsa'
    | 'fsa';
  provider?: string;
  description?: string;
  copays?: Record<string, number>;
  coinsurance?: Record<string, number>;
  features?: string[];
  contributionAmounts?: {
    employee: number;
    employer?: number;
  };
  annualCost?: number;
  coverageLevels?: {
    employee: number;
    employee_spouse?: number;
    employee_children?: number;
    family?: number;
  };
  deductible?: number;
  outOfPocketMax?: number;
  benefits?: string[];
  isActive?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

