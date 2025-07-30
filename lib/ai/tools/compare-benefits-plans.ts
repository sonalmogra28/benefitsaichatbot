import { z } from 'zod';
import { tool } from 'ai';
import { auth } from '@/app/(auth)/stack-auth';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  benefitPlans,
  benefitEnrollments,
  users,
  companies,
} from '@/lib/db/schema-v2';
import { eq, and, inArray } from 'drizzle-orm';
import { config } from 'dotenv';

// Load environment variables
config({ path: process.env.NODE_ENV === 'production' ? undefined : '.env' });

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
  execute: async (rawParams: any) => {
    const { planIds, comparisonType, userContext } =
      compareBenefitsPlansSchema.parse(rawParams);

    try {
      // Get authenticated session
      const session = await auth();
      if (!session?.user?.email) {
        throw new Error('User not authenticated');
      }

      // Connect to database
      const connectionString =
        process.env.POSTGRES_URL || process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('Database connection string not configured');
      }
      const client = postgres(connectionString);
      const db = drizzle(client, {
        schema: { benefitPlans, benefitEnrollments, users, companies },
      });

      try {
        // Get user and company context
        const user = await db.query.users.findFirst({
          where: eq(users.email, session.user.email),
          with: {
            company: true,
          },
        });

        if (!user) {
          return {
            error: 'User not found in database',
            plans: [],
          };
        }

        // Get the specified benefit plans for comparison
        const plans = await db.query.benefitPlans.findMany({
          where: and(
            inArray(benefitPlans.id, planIds),
            eq(benefitPlans.companyId, user.companyId),
            eq(benefitPlans.isActive, true),
          ),
        });

        if (plans.length === 0) {
          return {
            message: 'No active benefit plans found for comparison',
            plans: [],
          };
        }

        // Calculate costs and prepare comparison data
        const coverageType = userContext?.coverageType || 'individual';
        const plansWithAnalysis = plans.map((plan) => {
          const monthlyCost =
            coverageType === 'family'
              ? Number.parseFloat(plan.monthlyPremiumFamily || '0')
              : Number.parseFloat(plan.monthlyPremiumEmployee || '0');

          const annualCost = monthlyCost * 12;

          const deductible =
            coverageType === 'family'
              ? Number.parseFloat(plan.deductibleFamily || '0')
              : Number.parseFloat(plan.deductibleIndividual || '0');

          const outOfPocketMax =
            coverageType === 'family'
              ? Number.parseFloat(plan.outOfPocketMaxFamily || '0')
              : Number.parseFloat(plan.outOfPocketMaxIndividual || '0');

          return {
            id: plan.id,
            name: plan.name,
            type: plan.type,
            category: plan.category,
            provider: plan.provider,
            description: plan.description,
            costs: {
              monthlyCost,
              annualCost,
              deductible,
              outOfPocketMax,
              copayPrimaryCare: Number.parseFloat(plan.copayPrimaryCare || '0'),
              copaySpecialist: Number.parseFloat(plan.copaySpecialist || '0'),
              coinsurancePercentage: plan.coinsurancePercentage || 0,
            },
            features: plan.features || [],
            coverageDetails: plan.coverageDetails || {},
          };
        });

        // Generate comparison analysis
        const analysis = {
          totalPlans: plansWithAnalysis.length,
          coverageType,
          costComparison: {
            lowestMonthlyCost: Math.min(
              ...plansWithAnalysis.map((p) => p.costs.monthlyCost),
            ),
            highestMonthlyCost: Math.max(
              ...plansWithAnalysis.map((p) => p.costs.monthlyCost),
            ),
            averageDeductible:
              plansWithAnalysis.reduce(
                (sum, p) => sum + p.costs.deductible,
                0,
              ) / plansWithAnalysis.length,
            lowestDeductible: Math.min(
              ...plansWithAnalysis.map((p) => p.costs.deductible),
            ),
            highestDeductible: Math.max(
              ...plansWithAnalysis.map((p) => p.costs.deductible),
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
      } finally {
        await client.end();
      }
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
