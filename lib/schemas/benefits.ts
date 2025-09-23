import { z } from 'zod';

export const createBenefitPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  description: z.string().optional(),
  type: z.enum(['medical', 'dental', 'vision', 'life', 'disability', 'retirement', 'other']),
  category: z.enum(['health', 'dental', 'vision', 'life', 'disability', 'retirement', 'voluntary']),
  coverageTier: z.enum(['employeeOnly', 'employeeSpouse', 'employeeChildren', 'employeeFamily']),
  monthlyPremium: z.number().min(0, 'Monthly premium must be positive'),
  annualDeductible: z.number().min(0, 'Annual deductible must be positive').optional(),
  coPay: z.number().min(0, 'Co-pay must be positive').optional(),
  coInsurance: z.number().min(0).max(100, 'Co-insurance must be between 0-100').optional(),
  outOfPocketMax: z.number().min(0, 'Out-of-pocket maximum must be positive').optional(),
  networkType: z.enum(['HMO', 'PPO', 'EPO', 'POS']).optional(),
  provider: z.string().min(1, 'Provider is required'),
  effectiveDate: z.string().datetime('Invalid effective date'),
  endDate: z.string().datetime('Invalid end date').optional(),
  isActive: z.boolean().default(true),
  features: z.array(z.string()).optional(),
  limitations: z.array(z.string()).optional(),
  eligibilityRequirements: z.array(z.string()).optional(),
  enrollmentDeadline: z.string().datetime('Invalid enrollment deadline').optional(),
  waitingPeriod: z.number().min(0, 'Waiting period must be positive').optional(),
  maxCoverage: z.number().min(0, 'Maximum coverage must be positive').optional(),
  employerContribution: z.number().min(0, 'Employer contribution must be positive').optional(),
  employeeContribution: z.number().min(0, 'Employee contribution must be positive').optional(),
  metadata: z.record(z.any()).optional()
});

export const updateBenefitPlanSchema = createBenefitPlanSchema.partial().extend({
  id: z.string().min(1, 'Plan ID is required')
});

export const benefitPlanQuerySchema = z.object({
  type: z.enum(['medical', 'dental', 'vision', 'life', 'disability', 'retirement', 'other']).optional(),
  category: z.enum(['health', 'dental', 'vision', 'life', 'disability', 'retirement', 'voluntary']).optional(),
  coverageTier: z.enum(['employeeOnly', 'employeeSpouse', 'employeeChildren', 'employeeFamily']).optional(),
  isActive: z.boolean().optional(),
  provider: z.string().optional(),
  minPremium: z.number().min(0).optional(),
  maxPremium: z.number().min(0).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(10)
});

export const benefitEnrollmentSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  coverageTier: z.enum(['employeeOnly', 'employeeSpouse', 'employeeChildren', 'employeeFamily']),
  effectiveDate: z.string().datetime('Invalid effective date'),
  endDate: z.string().datetime('Invalid end date').optional(),
  dependents: z.array(z.object({
    name: z.string().min(1, 'Dependent name is required'),
    relationship: z.enum(['spouse', 'child', 'domestic_partner']),
    dateOfBirth: z.string().datetime('Invalid date of birth'),
    ssn: z.string().optional()
  })).optional(),
  beneficiary: z.object({
    name: z.string().min(1, 'Beneficiary name is required'),
    relationship: z.enum(['spouse', 'child', 'parent', 'sibling', 'other']),
    percentage: z.number().min(0).max(100, 'Beneficiary percentage must be between 0-100')
  }).optional(),
  isActive: z.boolean().default(true)
});

export const benefitComparisonSchema = z.object({
  planIds: z.array(z.string().min(1, 'Plan ID is required')).min(2, 'At least 2 plans required for comparison').max(5, 'Maximum 5 plans for comparison'),
  criteria: z.array(z.enum(['premium', 'deductible', 'coPay', 'coInsurance', 'outOfPocketMax', 'network', 'features'])).optional(),
  coverageTier: z.enum(['employeeOnly', 'employeeSpouse', 'employeeChildren', 'employeeFamily']).optional()
});

export type CreateBenefitPlanInput = z.infer<typeof createBenefitPlanSchema>;
export type UpdateBenefitPlanInput = z.infer<typeof updateBenefitPlanSchema>;
export type BenefitPlanQuery = z.infer<typeof benefitPlanQuerySchema>;
export type BenefitEnrollmentInput = z.infer<typeof benefitEnrollmentSchema>;
export type BenefitComparisonInput = z.infer<typeof benefitComparisonSchema>;