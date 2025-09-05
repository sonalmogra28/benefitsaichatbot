import { z } from 'zod';
import { tool } from 'ai';
import { benefitService } from '@/lib/firebase/services/benefit.service';
// User context from AI system

const compareBenefitsPlansSchema = z.object({
  planIds: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe('Array of benefit plan IDs to compare'),
  comparisonType: z
    .enum(['cost', 'coverage', 'features', 'all'])
    .default('all')
    .describe('Type of comparison to perform'),
  userContext: z
    .object({
      coverageType: z
        .enum(['individual', 'family'])
        .optional()
        .describe('Coverage type for cost calculations'),
      priorities: z
        .array(z.string())
        .optional()
        .describe(
          'User priorities (e.g., "low cost", "comprehensive coverage")',
        ),
    })
    .optional()
    .describe('User-specific context for personalized comparison'),
});

export const compareBenefitsPlans = tool({
  description:
    'Compare multiple benefit plans side by side with detailed analysis of costs, coverage, and features',
  parameters: compareBenefitsPlansSchema,
  execute: async (rawParams: any, { context }: any) => {
    const { planIds, comparisonType, userContext } =
      compareBenefitsPlansSchema.parse(rawParams);

    try {
      // Get authenticated session
      const user = context?.user || { companyId: 'default-company' };
      if (!user) {
        throw new Error('User not authenticated');
      }

      if (!user.companyId) {
        return {
          error: 'User not associated with a company',
          plans: [],
        };
      }

      // Get the specified benefit plans for comparison

      const allPlans = await benefitService.getBenefitPlans();
      const plans = allPlans.filter((p: any) => planIds.includes(p.id));

      if (plans.length === 0) {
        return {
          message: 'No active benefit plans found for comparison',
          plans: [],
        };
      }

      // Calculate costs and prepare comparison data
      const coverageType = userContext?.coverageType || 'individual';
      const plansWithAnalysis = plans.map((plan: any) => {
        const monthlyCost =
          plan.contributionAmounts?.employee ?? plan.monthlyPremium ?? 0;
        const annualCost = monthlyCost * 12;
        const deductible =
          coverageType === 'family'
            ? plan.deductibleFamily || 0
            : plan.deductibleIndividual || 0;
        const outOfPocketMax =
          coverageType === 'family'
            ? plan.outOfPocketMaxFamily || 0
            : plan.outOfPocketMaxIndividual || 0;

        return {
          id: plan.id,
          name: plan.name,
          type: plan.type,
          category: plan.category,
          provider: plan.provider,
          description: plan.description || '',
          costs: {
            monthlyCost,
            annualCost,
            deductible,
            outOfPocketMax,
            copayPrimaryCare: plan.copays?.primaryCare ?? 0,
            copaySpecialist: plan.copays?.specialist ?? 0,
            coinsurancePercentage:
              plan.coinsurance?.inNetwork ?? plan.coinsurance?.base ?? 0,
          },
          features: plan.features || [],
          contributionAmounts: plan.contributionAmounts || {
            employee: monthlyCost,
            employer: 0,
          },
          coverageDetails: plan.coverageDetails || {},
        };
      });

      // Generate comparison analysis
      const analysis = {
        totalPlans: plansWithAnalysis.length,
        coverageType,
        costComparison: {
          lowestMonthlyCost: Math.min(
            ...plansWithAnalysis.map((p: any) => p.costs.monthlyCost),
          ),
          highestMonthlyCost: Math.max(
            ...plansWithAnalysis.map((p: any) => p.costs.monthlyCost),
          ),
          averageDeductible:
            plansWithAnalysis.reduce(
              (sum: any, p: any) => sum + p.costs.deductible,
              0,
            ) / plansWithAnalysis.length,
          lowestDeductible: Math.min(
            ...plansWithAnalysis.map((p: any) => p.costs.deductible),
          ),
          highestDeductible: Math.max(
            ...plansWithAnalysis.map((p: any) => p.costs.deductible),
          ),
        },
        recommendations: generateRecommendations(
          plansWithAnalysis,
          userContext?.priorities || [],
        ),
      };

      return {
        message: `Successfully compared ${plansWithAnalysis.length} benefit plans`,
        plans: plansWithAnalysis,
        analysis,
        comparisonType,
      };
    } catch (error: any) {
      console.error('Error comparing benefit plans:', error);
      return {
        error: 'Failed to compare benefit plans',
        plans: [],
      };
    }
  },
});

// Also export as comparePlans for backward compatibility
export const comparePlans = compareBenefitsPlans;

// Helper function to generate recommendations
function generateRecommendations(plans: any[], priorities: string[]) {
  const recommendations = [];

  // Find lowest cost plan
  const lowestCostPlan = plans.reduce((min, plan) =>
    plan.costs.monthlyCost < min.costs.monthlyCost ? plan : min,
  );
  recommendations.push({
    type: 'lowest_cost',
    planId: lowestCostPlan.id,
    planName: lowestCostPlan.name,
    reason: `Lowest monthly premium at $${lowestCostPlan.costs.monthlyCost}`,
  });

  // Find lowest deductible plan
  const lowestDeductiblePlan = plans.reduce((min, plan) =>
    plan.costs.deductible < min.costs.deductible ? plan : min,
  );
  recommendations.push({
    type: 'lowest_deductible',
    planId: lowestDeductiblePlan.id,
    planName: lowestDeductiblePlan.name,
    reason: `Lowest deductible at $${lowestDeductiblePlan.costs.deductible}`,
  });

  // Find most comprehensive plan (most features)
  const mostComprehensivePlan = plans.reduce((max, plan) =>
    plan.features.length > max.features.length ? plan : max,
  );
  recommendations.push({
    type: 'most_comprehensive',
    planId: mostComprehensivePlan.id,
    planName: mostComprehensivePlan.name,
    reason: `Most comprehensive with ${mostComprehensivePlan.features.length} features`,
  });

  return recommendations;
}
