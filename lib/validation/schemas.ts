import { z } from 'zod';

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  companyId: z.string().uuid(),
  role: z.enum(['employee', 'hr-admin', 'company-admin']),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  department: z.string().optional(),
  role: z.enum(['employee', 'hr-admin', 'company-admin']).optional(),
});

// ============================================================================
// COMPANY SCHEMAS
// ============================================================================

export const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  domain: z.string().optional(),
});

export const updateCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required').optional(),
  domain: z.string().optional(),
  settings: z.record(z.any()).optional(),
});

// ============================================================================
// BENEFITS SCHEMAS
// ============================================================================

export const createBenefitPlanSchema = z.object({
  name: z.string().min(1, 'Plan name is required'),
  type: z.enum([
    'health',
    'dental',
    'vision',
    'life',
    'disability',
    'retirement',
  ]),
  category: z.string(),
  provider: z.string(),
  monthlyPremiumEmployee: z.number().positive(),
  monthlyPremiumFamily: z.number().positive(),
  deductibleIndividual: z.number().positive(),
  deductibleFamily: z.number().positive(),
  outOfPocketMaxIndividual: z.number().positive(),
  outOfPocketMaxFamily: z.number().positive(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
});

// ============================================================================
// ENROLLMENT SCHEMAS
// ============================================================================

export const createEnrollmentSchema = z.object({
  planId: z.string().uuid(),
  coverageType: z.enum(['individual', 'family', 'employee_spouse']),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
});
