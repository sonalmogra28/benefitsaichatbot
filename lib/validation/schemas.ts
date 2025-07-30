import { z } from 'zod';

/**
 * Shared field helpers
 */
export const id = z.string().uuid();
export const timestamp = z.string().datetime();

/**
 * Company validation schema
 */
export const companySchema = z.object({
  id,
  stackOrgId: z.string(),
  name: z.string().min(1),
  domain: z.string().optional(),
  settings: z.record(z.any()).optional(),
  subscriptionTier: z.enum(['basic', 'pro', 'enterprise']).optional(),
  isActive: z.boolean().optional(),
  createdAt: timestamp.optional(),
  updatedAt: timestamp.optional(),
});

export type CompanyInput = z.infer<typeof companySchema>;

/**
 * User schema
 */
export const userSchema = z.object({
  id,
  stackUserId: z.string(),
  companyId: id,
  email: z.string().email(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.enum(['employee', 'hr_admin', 'company_admin']).optional(),
  employeeId: z.string().optional(),
  department: z.string().optional(),
  hireDate: z.string().date().optional(),
  isActive: z.boolean().optional(),
  createdAt: timestamp.optional(),
  updatedAt: timestamp.optional(),
});

export type UserInput = z.infer<typeof userSchema>;

/**
 * Benefit Plan schema (subset for validation)
 */
export const benefitPlanSchema = z.object({
  id,
  companyId: id,
  name: z.string(),
  type: z.string(),
  category: z.string(),
  provider: z.string(),
  description: z.string().optional(),
  monthlyPremiumEmployee: z.string().optional(),
  monthlyPremiumFamily: z.string().optional(),
  deductibleIndividual: z.string().optional(),
  deductibleFamily: z.string().optional(),
  outOfPocketMaxIndividual: z.string().optional(),
  outOfPocketMaxFamily: z.string().optional(),
  copayPrimaryCare: z.string().optional(),
  copaySpecialist: z.string().optional(),
  coinsurancePercentage: z.number().int().optional(),
  features: z.array(z.string()).optional(),
  coverageDetails: z.record(z.any()).optional(),
  effectiveDate: z.string().date(),
  endDate: z.string().date().optional(),
  isActive: z.boolean().optional(),
  createdAt: timestamp.optional(),
  updatedAt: timestamp.optional(),
});

export type BenefitPlanInput = z.infer<typeof benefitPlanSchema>;

/**
 * Benefit Enrollment schema (subset)
 */
export const benefitEnrollmentSchema = z.object({
  id,
  userId: id,
  benefitPlanId: id,
  coverageType: z.string().default('employee'),
  enrollmentDate: z.string().date().default(() => new Date().toISOString().split('T')[0]),
  effectiveDate: z.string().date(),
  endDate: z.string().date().optional(),
  monthlyCost: z.string().default('0'),
  employerContribution: z.string().default('0'),
  employeeContribution: z.string().default('0'),
  dependents: z.array(z.any()).default([]),
  status: z.enum(['active', 'terminated', 'pending']).optional().default('active'),
  createdAt: timestamp.optional(),
  updatedAt: timestamp.optional(),
});

export type BenefitEnrollmentInput = z.infer<typeof benefitEnrollmentSchema>;

/**
 * Knowledge base document schema (subset)
 */
export const knowledgeBaseDocumentSchema = z.object({
  id,
  companyId: id,
  title: z.string(),
  content: z.string().default(''),
  documentType: z.string().default('faq'),
  category: z.string().optional(),
  createdBy: id.optional(),
  createdAt: timestamp.optional(),
  updatedAt: timestamp.optional(),
});

export type KnowledgeBaseDocumentInput = z.infer<typeof knowledgeBaseDocumentSchema>;

/**
 * Export collection of schemas for easy access
 */
export const Schemas = {
  company: companySchema,
  user: userSchema,
  benefitPlan: benefitPlanSchema,
  benefitEnrollment: benefitEnrollmentSchema,
  knowledgeBaseDocument: knowledgeBaseDocumentSchema,
};
