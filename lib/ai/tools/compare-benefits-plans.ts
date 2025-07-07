import { tool } from 'ai';
import { z } from 'zod';

export const comparePlans = tool({
  description: "Compare health insurance plans",
  inputSchema: z.object({
    planType: z.enum(['HMO', 'PPO', 'HDHP']).describe("Type of plans to compare"),
    familySize: z.number().optional().describe("Number of family members")
  }),
  execute: async ({ planType, familySize }) => {
    // For now, return mock data
    return {
      plans: [
        {
          name: "Essential HMO",
          type: "HMO",
          monthlyPremium: familySize ? 450 * familySize : 450,
          deductible: 1500,
          outOfPocketMax: 3000,
          features: ["Low premiums", "Primary care required", "Network only"]
        },
        {
          name: "Choice PPO",
          type: "PPO", 
          monthlyPremium: familySize ? 650 * familySize : 650,
          deductible: 1000,
          outOfPocketMax: 5000,
          features: ["Any doctor", "No referrals", "Out-of-network coverage"]
        },
        {
          name: "Saver HDHP",
          type: "HDHP",
          monthlyPremium: familySize ? 350 * familySize : 350,
          deductible: 3000,
          outOfPocketMax: 6000,
          features: ["HSA eligible", "Lowest premiums", "Preventive care covered"]
        }
      ]
    };
  }
});