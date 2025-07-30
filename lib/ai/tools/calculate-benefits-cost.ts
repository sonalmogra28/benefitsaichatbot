import { tool } from 'ai';
import { z } from 'zod';

export const calculateBenefitsCost = tool({
  description: "Calculate estimated annual benefits costs",
  inputSchema: z.object({
    expectedMedicalUsage: z.enum(['low', 'moderate', 'high']),
    planType: z.string()
  }),
  execute: async ({ expectedMedicalUsage, planType }: { expectedMedicalUsage: string; planType: string }) => {
    const usageMultipliers: Record<string, number> = { low: 0.3, moderate: 0.6, high: 0.9 };
    const multiplier = usageMultipliers[expectedMedicalUsage] || 0.6;
    
    return {
      estimatedAnnualCost: Math.round(5000 * multiplier),
      breakdown: {
        premiums: 5400,
        estimatedOutOfPocket: Math.round(3000 * multiplier),
        total: 5400 + Math.round(3000 * multiplier)
      }
    };
  }
});