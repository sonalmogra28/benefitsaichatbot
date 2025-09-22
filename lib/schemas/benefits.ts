import { z } from 'zod';

export const benefitEnrollmentSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  coverageType: z.enum(['individual', 'family', 'employee_plus_one']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  dependents: z.array(z.object({
    name: z.string(),
    relationship: z.string(),
    dateOfBirth: z.string().datetime(),
  })).optional(),
  beneficiary: z.object({
    name: z.string(),
    relationship: z.string(),
    percentage: z.number().min(0).max(100),
  }).optional(),
});

export const benefitPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['health', 'dental', 'vision', 'life', 'disability', 'retirement']),
  description: z.string(),
  monthlyCost: z.number().min(0),
  annualDeductible: z.number().min(0).optional(),
  coveragePercentage: z.number().min(0).max(100).optional(),
  maxOutOfPocket: z.number().min(0).optional(),
  isActive: z.boolean().default(true),
  enrollmentPeriod: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
  }).optional(),
  eligibility: z.object({
    minAge: z.number().optional(),
    maxAge: z.number().optional(),
    employmentStatus: z.array(z.string()).optional(),
  }).optional(),
});

export const benefitComparisonSchema = z.object({
  plans: z.array(z.string()),
  criteria: z.array(z.string()),
  employeeProfile: z.object({
    age: z.number(),
    dependents: z.number(),
    income: z.number(),
    healthStatus: z.string(),
  }),
});

export type BenefitEnrollment = z.infer<typeof benefitEnrollmentSchema>;
export type BenefitPlan = z.infer<typeof benefitPlanSchema>;
export type BenefitComparison = z.infer<typeof benefitComparisonSchema>;
