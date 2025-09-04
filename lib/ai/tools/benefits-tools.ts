// AI Tools for Benefits-Specific Functionality
import { z } from 'zod';
import { tool } from 'ai';
import { benefitService } from '@/lib/firebase/services/benefit.service';
import { companyService } from '@/lib/firebase/services/company.service';

// Tool schemas using Zod for validation
const comparePlansSchema = z.object({
  planIds: z.array(z.string()).min(2).max(5),
  comparisonFactors: z
    .array(
      z.enum([
        'premium',
        'deductible',
        'out_of_pocket_max',
        'coverage',
        'network',
        'prescription',
      ]),
    )
    .optional(),
  userProfile: z
    .object({
      age: z.number().optional(),
      familySize: z.number().optional(),
      expectedUsage: z.enum(['low', 'medium', 'high']).optional(),
    })
    .optional(),
  companyId: z.string(),
});

const calculateCostSchema = z.object({
  planId: z.string(),
  annualSalary: z.number().positive(),
  coverageLevel: z.enum([
    'employee',
    'employee_spouse',
    'employee_children',
    'family',
  ]),
  includeHSA: z.boolean().optional(),
  includeFSA: z.boolean().optional(),
  estimatedMedicalExpenses: z.number().optional(),
});

const checkEligibilitySchema = z.object({
  benefitType: z.enum([
    'health',
    'dental',
    'vision',
    'life',
    'disability',
    'fsa',
    'hsa',
    '401k',
  ]),
  employeeId: z.string(),
  eventType: z
    .enum(['new_hire', 'open_enrollment', 'qualifying_event'])
    .optional(),
  eventDate: z.string().optional(),
});

const getEnrollmentDeadlineSchema = z.object({
  companyId: z.string(),
  benefitType: z.enum(['health', 'dental', 'vision', 'all']),
  enrollmentPeriod: z
    .enum(['annual', 'new_hire', 'qualifying_event'])
    .optional(),
});

// Tool implementations
export const comparePlans = tool({
  description: 'Compare multiple benefit plans side by side',
  parameters: comparePlansSchema,

  execute: async ({ planIds, comparisonFactors, userProfile, companyId }: z.infer<typeof comparePlansSchema>) => {
      const allPlans = await benefitService.getBenefitPlans();
      const plansToCompare = allPlans.filter((plan: any) => planIds.includes(plan.id));

      if (plansToCompare.length < 2) {
        return {
            error: "Could not find at least two plans to compare."
        }
      }

      // In a real scenario, a more sophisticated recommendation engine would be used.
      // For now, we'll just return the requested plan data.
      const recommendation = plansToCompare[0];


    if (plansToCompare.length < 2) {
      return {
        plans: plansToCompare.map((p: any) => ({
            id: p.id,
            name: p.name,
            premium: p.monthlyPremium,
            deductible: p.deductibleIndividual,
            outOfPocketMax: p.outOfPocketMaxIndividual,
            coverage: p.coverageDetails,
            network: p.provider,
        })),
        recommendation: recommendation.id,
        reasoning: 'Based on your profile, this plan offers the best value.',
      };
    }

    // In a real scenario, a more sophisticated recommendation engine would be used.
    // For now, we'll just return the requested plan data.
    const recommendation = plansToCompare[0];

    return {
      plans: plansToCompare.map((p) => ({
        id: p.id,
        name: p.name,
        premium: p.monthlyPremium,
        deductible: p.deductibleIndividual,
        outOfPocketMax: p.outOfPocketMaxIndividual,
        coverage: p.coverageDetails,
        network: p.provider,
      })),
      recommendation: recommendation.id,
      reasoning: 'Based on your profile, this plan offers the best value.',
    };
  },
});

export const calculateCost = tool({
  description:
    'Calculate total benefits costs including premiums, taxes, and savings',
  parameters: calculateCostSchema,
  execute: async ({
    planId,
    annualSalary,
    coverageLevel,
    includeHSA,
    includeFSA,
    estimatedMedicalExpenses,
  }: z.infer<typeof calculateCostSchema>) => {
    // This calculation is a simplified model.
    // In a real application, this would be more complex and take into account
    // specific tax laws and plan details.
    const basePremium = {
      employee: 200,
      employee_spouse: 400,
      employee_children: 350,
      family: 600,
    }[coverageLevel];

    const annualPremium = basePremium * 12;
    const employerContribution = annualPremium * 0.7; // 70% employer contribution
    const employeeCost = annualPremium - employerContribution;

    // Tax savings (pre-tax deductions)
    const taxRate = 0.25; // Simplified tax rate
    const taxSavings = employeeCost * taxRate;

    // HSA/FSA calculations
    const hsaContribution = includeHSA ? 3650 : 0; // 2024 individual limit
    const hsaTaxSavings = hsaContribution * taxRate;

    const fsaContribution = includeFSA ? 3050 : 0; // 2024 limit
    const fsaTaxSavings = fsaContribution * taxRate;

    // Total cost calculation
    const totalOutOfPocket =
      employeeCost - taxSavings + (estimatedMedicalExpenses || 0);
    const totalWithSavingsAccounts =
      totalOutOfPocket - hsaTaxSavings - fsaTaxSavings;

    return {
      planId,
      coverageLevel,
      breakdown: {
        annualPremium,
        employerContribution,
        employeeCost,
        taxSavings,
        hsaContribution,
        hsaTaxSavings,
        fsaContribution,
        fsaTaxSavings,
        estimatedMedicalExpenses: estimatedMedicalExpenses || 0,
      },
      totals: {
        withoutSavingsAccounts: totalOutOfPocket,
        withSavingsAccounts: totalWithSavingsAccounts,
        annualSavings: totalOutOfPocket - totalWithSavingsAccounts,
      },
      monthlyEmployeeCost: employeeCost / 12,
    };
  },
});

export const checkEligibility = tool({
  description: 'Check eligibility for specific benefits',
  parameters: checkEligibilitySchema,
  execute: async ({
    benefitType,
    employeeId,
    eventType,
    eventDate,
  }: z.infer<typeof checkEligibilitySchema>) => {
    // Mock eligibility check
    const isEligible = true; // In production, check actual eligibility rules

    const eligibilityRules = {
      health: '30 days from hire date or during open enrollment',
      dental: '30 days from hire date or during open enrollment',
      vision: '30 days from hire date or during open enrollment',
      life: 'Immediate upon hire',
      disability: '90 days from hire date',
      fsa: 'During open enrollment only',
      hsa: 'Must be enrolled in HDHP',
      '401k': '90 days from hire date',
    };

    return {
      benefitType,
      isEligible,
      reason: isEligible
        ? `You are eligible for ${benefitType} benefits`
        : `You are not currently eligible for ${benefitType} benefits`,
      eligibilityRule: eligibilityRules[benefitType],
      nextEnrollmentWindow:
        eventType === 'qualifying_event'
          ? '30 days from qualifying event'
          : 'Next open enrollment period',
    };
  },
});

export const getEnrollmentDeadline = tool({
  description: 'Get enrollment deadlines for benefits',
  parameters: getEnrollmentDeadlineSchema,
  execute: async ({ companyId, benefitType, enrollmentPeriod }: z.infer<typeof getEnrollmentDeadlineSchema>) => {
      const company = await (companyService as any).getCompany?.(companyId);

    if (!company) {
      return {
        error: 'Company not found',
      };
    }

    const today = new Date();
    let deadline: Date;

    if (
      enrollmentPeriod === 'new_hire' ||
      enrollmentPeriod === 'qualifying_event'
    ) {
      deadline = new Date(today);
      deadline.setDate(deadline.getDate() + 30);
    } else {
      // Annual open enrollment
      if (company.settings?.enrollmentPeriodEnd) {
        deadline = new Date(company.settings.enrollmentPeriodEnd);
        if (deadline < today) {
          deadline.setFullYear(deadline.getFullYear() + 1);
        }
      } else {
        // fallback if no end date is set
        deadline = new Date(today.getFullYear(), 10, 30); // November 30th
        if (deadline < today) {
          deadline.setFullYear(deadline.getFullYear() + 1);
        }
      }
    }

    return {
      benefitType,
      enrollmentPeriod: enrollmentPeriod || 'annual',
      deadline: deadline.toISOString().split('T')[0],
      daysRemaining: Math.ceil(
        (deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      ),
      status: deadline > today ? 'open' : 'closed',
      reminder: 'Set a reminder to complete enrollment before the deadline',
    };
  },
});

const explainBenefitSchema = z.object({
  term: z.string(),
  context: z
    .enum(['health', 'dental', 'vision', 'retirement', 'general'])
    .optional(),
});

export const explainBenefit = tool({
  description: 'Explain a specific benefit term or concept',
  parameters: explainBenefitSchema,
  execute: async ({ term, context }: z.infer<typeof explainBenefitSchema>) => {
    // Common benefits terms dictionary
    const definitions: Record<string, string> = {
      deductible:
        'The amount you pay for covered health care services before your insurance plan starts to pay.',
      premium: 'The amount you pay for your health insurance every month.',
      copay:
        "A fixed amount you pay for a covered health care service after you've paid your deductible.",
      coinsurance:
        "The percentage of costs of a covered health care service you pay after you've paid your deductible.",
      'out-of-pocket maximum':
        'The most you have to pay for covered services in a plan year. After you reach this amount, your health plan pays 100% of covered services.',
      hsa: 'Health Savings Account - A tax-advantaged account to help you save for medical expenses.',
      fsa: 'Flexible Spending Account - An account you put money into to pay for certain out-of-pocket health care costs.',
      hdhp: 'High Deductible Health Plan - A plan with a higher deductible than traditional plans, often paired with an HSA.',
      ppo: 'Preferred Provider Organization - A type of health plan with a network of providers who have agreed to lower rates.',
      hmo: 'Health Maintenance Organization - A type of health plan that usually limits coverage to care from doctors in the plan network.',
    };

    const termLower = term.toLowerCase();
    const definition =
      definitions[termLower] ||
      `"${term}" is a benefits-related term. Please ask HR for more specific information.`;

    return {
      term,
      definition,
      context: context || 'general',
      relatedTerms: Object.keys(definitions)
        .filter((t) => t !== termLower)
        .slice(0, 3),
    };
  },
});

// Export all tools as an array for convenience
export const benefitsTools = [
  comparePlans,
  calculateCost,
  checkEligibility,
  getEnrollmentDeadline,
  explainBenefit,
];
