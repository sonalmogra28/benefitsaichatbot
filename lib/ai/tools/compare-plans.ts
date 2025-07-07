import { tool } from 'ai';
import { z } from 'zod';

export const comparePlans = tool({
  description: 'Compare health insurance or benefits plans side-by-side with detailed analysis',
  inputSchema: z.object({
    planType: z.enum(['health', 'dental', 'vision', 'retirement']).describe('Type of plans to compare'),
    plans: z.array(z.object({
      name: z.string().describe('Plan name'),
      type: z.string().describe('Plan type (e.g., HMO, PPO, EPO, HDHP)'),
      monthlyPremium: z.number().describe('Monthly premium cost'),
      deductible: z.number().describe('Annual deductible'),
      maxOutOfPocket: z.number().describe('Maximum out-of-pocket annually'),
      copayPrimaryDoc: z.number().optional().describe('Primary doctor copay'),
      copaySpecialist: z.number().optional().describe('Specialist copay'),
      copayEmergencyRoom: z.number().optional().describe('Emergency room copay'),
      coinsurance: z.number().optional().describe('Coinsurance percentage after deductible'),
      prescriptionCoverage: z.string().optional().describe('Prescription drug coverage details'),
      networkSize: z.enum(['small', 'medium', 'large']).optional().describe('Provider network size'),
      specialFeatures: z.array(z.string()).optional().describe('Special plan features'),
    })).min(2).max(4).describe('Plans to compare (2-4 plans)'),
    userProfile: z.object({
      age: z.number().optional().describe('User age'),
      hasFamily: z.boolean().optional().describe('Has family members to cover'),
      chronicConditions: z.array(z.string()).optional().describe('Any chronic health conditions'),
      expectedMedicalUsage: z.enum(['low', 'moderate', 'high']).optional().describe('Expected medical usage'),
      monthlyBudget: z.number().optional().describe('Monthly budget for premiums'),
      preferredDoctors: z.array(z.string()).optional().describe('Names of preferred doctors'),
    }).optional().describe('User profile for personalized recommendations'),
  }),
  execute: async ({ planType, plans, userProfile }) => {
    // Calculate annual costs for each plan
    const planComparisons = plans.map(plan => {
      const annualPremium = plan.monthlyPremium * 12;
      const totalMaxCost = annualPremium + plan.maxOutOfPocket;
      
      // Calculate estimated annual cost based on usage
      let estimatedAnnualCost = annualPremium;
      if (userProfile?.expectedMedicalUsage === 'high') {
        estimatedAnnualCost = annualPremium + (plan.maxOutOfPocket * 0.8);
      } else if (userProfile?.expectedMedicalUsage === 'moderate') {
        estimatedAnnualCost = annualPremium + (plan.deductible * 0.6) + ((plan.copayPrimaryDoc || 0) * 4) + ((plan.copaySpecialist || 0) * 2);
      } else {
        estimatedAnnualCost = annualPremium + ((plan.copayPrimaryDoc || 0) * 2);
      }

      // Calculate value score (lower is better)
      const valueScore = Math.round((estimatedAnnualCost / totalMaxCost) * 100);
      
      return {
        ...plan,
        annualPremium,
        totalMaxCost,
        estimatedAnnualCost: Math.round(estimatedAnnualCost),
        valueScore,
        isRecommended: false, // Will be set based on user profile
      };
    });

    // Sort by estimated annual cost
    planComparisons.sort((a, b) => a.estimatedAnnualCost - b.estimatedAnnualCost);

    // Mark recommended plan based on user profile
    if (userProfile) {
      let recommendedIndex = 0;
      
      if (userProfile.expectedMedicalUsage === 'high') {
        // Recommend plan with lowest max out-of-pocket
        recommendedIndex = planComparisons.findIndex(plan => 
          plan.maxOutOfPocket === Math.min(...planComparisons.map(p => p.maxOutOfPocket))
        );
      } else if (userProfile.expectedMedicalUsage === 'low') {
        // Recommend plan with lowest premium
        recommendedIndex = planComparisons.findIndex(plan => 
          plan.monthlyPremium === Math.min(...planComparisons.map(p => p.monthlyPremium))
        );
      } else {
        // Recommend plan with best value score
        recommendedIndex = planComparisons.findIndex(plan => 
          plan.valueScore === Math.min(...planComparisons.map(p => p.valueScore))
        );
      }
      
      planComparisons[recommendedIndex].isRecommended = true;
    }

    return {
      planType,
      plans: planComparisons,
      summary: {
        lowestPremium: Math.min(...planComparisons.map(p => p.monthlyPremium)),
        highestPremium: Math.max(...planComparisons.map(p => p.monthlyPremium)),
        averagePremium: Math.round(planComparisons.reduce((sum, p) => sum + p.monthlyPremium, 0) / planComparisons.length),
        lowestDeductible: Math.min(...planComparisons.map(p => p.deductible)),
        highestDeductible: Math.max(...planComparisons.map(p => p.deductible)),
        potentialSavings: Math.round(planComparisons[planComparisons.length - 1].estimatedAnnualCost - planComparisons[0].estimatedAnnualCost),
      },
      recommendations: planComparisons
        .filter(plan => plan.isRecommended)
        .map(plan => ({
          planName: plan.name,
          reason: userProfile?.expectedMedicalUsage === 'high' 
            ? 'Best for high medical usage - lowest maximum out-of-pocket'
            : userProfile?.expectedMedicalUsage === 'low'
            ? 'Best for low medical usage - lowest monthly premium'
            : 'Best overall value - optimal balance of premium and coverage',
          estimatedAnnualSavings: Math.round(planComparisons[planComparisons.length - 1].estimatedAnnualCost - plan.estimatedAnnualCost),
        })),
    };
  },
});