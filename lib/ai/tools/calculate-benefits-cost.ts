import { tool } from 'ai';
import { z } from 'zod';
import { auth } from '@/app/(auth)/stack-auth';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { benefitPlans, users } from '../../db/schema-v2';
import { getCurrentTenantContext } from '@/lib/db/tenant-context';

export const calculateBenefitsCost = tool({
  description: "Calculate estimated annual benefits costs based on plan details and expected usage",
  inputSchema: z.object({
    planId: z.string().optional().describe('Specific plan ID to calculate costs for'),
    planType: z.enum(['health', 'dental', 'vision']).default('health').describe('Type of benefit plan'),
    coverageType: z.enum(['individual', 'family', 'employee_spouse']).default('individual'),
    expectedMedicalUsage: z.enum(['low', 'moderate', 'high']).default('moderate'),
    additionalFactors: z.object({
      expectedDoctorVisits: z.number().min(0).default(4),
      expectedSpecialistVisits: z.number().min(0).default(2),
      expectedPrescriptions: z.number().min(0).default(12),
      expectedEmergencyVisits: z.number().min(0).default(0),
      expectedHospitalDays: z.number().min(0).default(0)
    }).optional()
  }),
  execute: async ({ 
    planId, 
    planType, 
    coverageType, 
    expectedMedicalUsage, 
    additionalFactors 
  }: {
    planId?: string;
    planType: 'health' | 'dental' | 'vision';
    coverageType: 'individual' | 'family' | 'employee_spouse';
    expectedMedicalUsage: 'low' | 'moderate' | 'high';
    additionalFactors?: {
      expectedDoctorVisits: number;
      expectedSpecialistVisits: number;
      expectedPrescriptions: number;
      expectedEmergencyVisits: number;
      expectedHospitalDays: number;
    };
  }) => {
    try {
      // Get current user session and tenant context
      const session = await auth();
      if (!session?.user?.id) {
        return {
          error: 'User not authenticated',
          estimatedAnnualCost: 0,
          breakdown: null
        };
      }

      const tenantContext = await getCurrentTenantContext();
      if (!tenantContext.companyId) {
        return {
          error: 'User not associated with a company',
          estimatedAnnualCost: 0,
          breakdown: null
        };
      }

      // Get benefit plan(s) to calculate costs
      let plans;
      if (planId) {
        // Get specific plan
        plans = await db
          .select()
          .from(benefitPlans)
          .where(
            and(
              eq(benefitPlans.id, planId),
              eq(benefitPlans.companyId, tenantContext.companyId),
              eq(benefitPlans.isActive, true)
            )
          );
      } else {
        // Get all plans of the specified type
        plans = await db
          .select()
          .from(benefitPlans)
          .where(
            and(
              eq(benefitPlans.type, planType),
              eq(benefitPlans.companyId, tenantContext.companyId),
              eq(benefitPlans.isActive, true)
            )
          );
      }

      if (plans.length === 0) {
        return {
          error: `No active ${planType} plans found`,
          estimatedAnnualCost: 0,
          breakdown: null
        };
      }

      // Calculate costs for each plan
      const usageMultipliers: Record<string, number> = { 
        low: 0.3, 
        moderate: 0.6, 
        high: 0.9 
      };
      const multiplier = usageMultipliers[expectedMedicalUsage] || 0.6;

      const planCosts = plans.map(plan => {
        // Get monthly premium based on coverage type
        let monthlyPremium = 0;
        if (coverageType === 'individual') {
          monthlyPremium = Number(plan.monthlyPremiumEmployee || 0);
        } else if (coverageType === 'family') {
          monthlyPremium = Number(plan.monthlyPremiumFamily || 0);
        } else if (coverageType === 'employee_spouse') {
          const individual = Number(plan.monthlyPremiumEmployee || 0);
          const family = Number(plan.monthlyPremiumFamily || 0);
          monthlyPremium = individual + ((family - individual) * 0.6);
        }

        const annualPremium = monthlyPremium * 12;

        // Calculate estimated out-of-pocket costs
        const deductible = coverageType === 'family' 
          ? Number(plan.deductibleFamily || 0)
          : Number(plan.deductibleIndividual || 0);
        
        const outOfPocketMax = coverageType === 'family'
          ? Number(plan.outOfPocketMaxFamily || 0)
          : Number(plan.outOfPocketMaxIndividual || 0);

        // Calculate expected costs based on usage
        let estimatedMedicalCosts = 0;
        
        if (planType === 'health' && additionalFactors) {
          const { 
            expectedDoctorVisits = 4, 
            expectedSpecialistVisits = 2,
            expectedPrescriptions = 12,
            expectedEmergencyVisits = 0,
            expectedHospitalDays = 0
          } = additionalFactors;

          // Calculate costs based on copays and coinsurance
          const copayPrimary = Number(plan.copayPrimaryCare || 25);
          const copaySpecialist = Number(plan.copaySpecialist || 50);
          const coinsurance = (plan.coinsurancePercentage || 20) / 100;

          estimatedMedicalCosts = 
            (expectedDoctorVisits * copayPrimary) +
            (expectedSpecialistVisits * copaySpecialist) +
            (expectedPrescriptions * 20) + // Average prescription copay
            (expectedEmergencyVisits * 250) + // Average ER copay
            (expectedHospitalDays * 1000 * coinsurance); // Hospital costs after deductible
        } else {
          // Simple estimation based on usage level
          estimatedMedicalCosts = deductible * multiplier;
        }

        // Cap at out-of-pocket maximum
        const totalOutOfPocket = Math.min(
          deductible + estimatedMedicalCosts,
          outOfPocketMax
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
            totalAnnualCost
          },
          details: {
            coverageType,
            expectedUsage: expectedMedicalUsage,
            copayPrimary: Number(plan.copayPrimaryCare || 0),
            copaySpecialist: Number(plan.copaySpecialist || 0),
            coinsurance: plan.coinsurancePercentage || 0
          }
        };
      });

      // Sort by total cost
      planCosts.sort((a, b) => a.costs.totalAnnualCost - b.costs.totalAnnualCost);

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
            outOfPocketMax: plan.costs.outOfPocketMax
          },
          details: plan.details
        };
      }

      // Return comparison of all plans
      return {
        message: `Cost analysis for ${planCosts.length} ${planType} plans`,
        lowestCostOption: planCosts[0],
        allOptions: planCosts,
        summary: {
          lowestAnnualCost: planCosts[0].costs.totalAnnualCost,
          highestAnnualCost: planCosts[planCosts.length - 1].costs.totalAnnualCost,
          averageAnnualCost: Math.round(
            planCosts.reduce((sum, p) => sum + p.costs.totalAnnualCost, 0) / planCosts.length
          )
        }
      };

    } catch (error) {
      console.error('Error calculating benefits cost:', error);
      return {
        error: 'Unable to calculate benefits cost. Please try again later.',
        estimatedAnnualCost: 0,
        breakdown: null
      };
    }
  }
});