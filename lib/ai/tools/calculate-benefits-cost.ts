import { tool } from 'ai';
import { z } from 'zod';
import { benefitService } from '@/lib/firebase/services/benefit.service';
// User context from AI system

const inputSchema = z.object({
  planId: z
    .string()
    .optional()
    .describe('Specific plan ID to calculate costs for'),
  planType: z
    .enum(['health', 'dental', 'vision'])
    .default('health')
    .describe('Type of benefit plan'),
  coverageType: z
    .enum(['individual', 'family', 'employee_spouse'])
    .default('individual'),
  expectedMedicalUsage: z.enum(['low', 'moderate', 'high']).default('moderate'),
  additionalFactors: z
    .object({
      expectedDoctorVisits: z.number().min(0).default(4),
      expectedSpecialistVisits: z.number().min(0).default(2),
      expectedPrescriptions: z.number().min(0).default(12),
      expectedEmergencyVisits: z.number().min(0).default(0),
      expectedHospitalDays: z.number().min(0).default(0),
    })
    .optional(),
});

export const calculateBenefitsCost = tool({
  description:
    'Calculate estimated annual benefits costs based on plan details and expected usage',
  inputSchema,
  execute: async (
    {
      planId,
      planType,
      coverageType,
      expectedMedicalUsage,
      additionalFactors,
    }: z.infer<typeof inputSchema>,
    { context }: any,
  ) => {
    try {
      // Get user context from AI system
      const user = context?.user || { companyId: 'default-company' };

      if (!user.companyId) {
        return {
          error: 'User not associated with a company',
          estimatedAnnualCost: 0,
          breakdown: null,
        };
      }

      // Get benefit plan(s) to calculate costs
      let plans = await benefitService.getBenefitPlans();
      if (planId) {
        plans = plans.filter((p: any) => p.id === planId);
      } else {
        plans = plans.filter((p: any) => p.type === planType);
      }

      if (plans.length === 0) {
        return {
          error: `No active ${planType} plans found`,
          estimatedAnnualCost: 0,
          breakdown: null,
        };
      }

      // Calculate costs for each plan
      const usageMultipliers: Record<string, number> = {
        low: 0.3,
        moderate: 0.6,
        high: 0.9,
      };
      const multiplier = usageMultipliers[expectedMedicalUsage] || 0.6;

      const planCosts = plans.map((plan: any) => {
        // Get monthly premium based on coverage type
        let monthlyPremium = 0;
        if (coverageType === 'individual') {
          monthlyPremium =
            plan.contributionAmounts?.employee ||
            plan.coverageLevels?.employee ||
            plan.monthlyPremium ||
            0;
        } else if (coverageType === 'family') {
          monthlyPremium =
            plan.coverageLevels?.family ||
            plan.contributionAmounts?.employee ||
            plan.monthlyPremium ||
            0;
        } else if (coverageType === 'employee_spouse') {
          monthlyPremium =
            plan.coverageLevels?.employee_spouse ||
            plan.coverageLevels?.family ||
            plan.contributionAmounts?.employee ||
            plan.monthlyPremium ||
            0;
        }

        const annualPremium = monthlyPremium * 12;

        // Calculate estimated out-of-pocket costs
        const deductible =
          coverageType === 'family'
            ? plan.deductibleFamily || 0
            : plan.deductibleIndividual || 0;

        const outOfPocketMax =
          coverageType === 'family'
            ? plan.outOfPocketMaxFamily || 0
            : plan.outOfPocketMaxIndividual || 0;

        // Calculate expected costs based on usage
        const estimatedMedicalCosts = deductible * multiplier;

        // Cap at out-of-pocket maximum
        const totalOutOfPocket = Math.min(
          deductible + estimatedMedicalCosts,
          outOfPocketMax,
        );

        const totalAnnualCost = annualPremium + totalOutOfPocket;

        return {
          planId: plan.id,
          planName: plan.name,
          planCategory: plan.category,
          provider: plan.provider,
          costs: {
            monthlyPremium,
            annualPremium,
            deductible,
            outOfPocketMax,
            estimatedOutOfPocket: totalOutOfPocket,
            totalAnnualCost,
          },
          details: {
            coverageType,
            expectedUsage: expectedMedicalUsage,
          },
        };
      });

      // Sort by total cost
      planCosts.sort((a: any, b: any) => a.costs.totalAnnualCost - b.costs.totalAnnualCost);

      // If specific plan requested, return single result
      if (planId && planCosts.length > 0) {
        const plan = planCosts[0];
        return {
          planId: plan.planId,
          planName: plan.planName,
          estimatedAnnualCost: plan.costs.totalAnnualCost,
          breakdown: {
            premiums: plan.costs.annualPremium,
            estimatedOutOfPocket: plan.costs.estimatedOutOfPocket,
            total: plan.costs.totalAnnualCost,
            deductible: plan.costs.deductible,
            outOfPocketMax: plan.costs.outOfPocketMax,
          },
          details: plan.details,
        };
      }

      // Return comparison of all plans
      return {
        message: `Cost analysis for ${planCosts.length} ${planType} plans`,
        lowestCostOption: planCosts[0],
        allOptions: planCosts,
        summary: {
          lowestAnnualCost: planCosts[0].costs.totalAnnualCost,
          highestAnnualCost:
            planCosts[planCosts.length - 1].costs.totalAnnualCost,
          averageAnnualCost: Math.round(
            planCosts.reduce((sum, p) => sum + p.costs.totalAnnualCost, 0) /
              planCosts.length,
          ),
        },
      };
    } catch (error) {
      console.error('Error calculating benefits cost:', error);
      return {
        error: 'Unable to calculate benefits cost. Please try again later.',
        estimatedAnnualCost: 0,
        breakdown: null,
      };
    }
  },
});
