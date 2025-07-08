import { tool } from 'ai';
import { z } from 'zod';

export const showBenefitsDashboard = tool({
  description: "Show a comprehensive benefits dashboard",
  inputSchema: z.object({
    userId: z.string().optional().describe("User ID for personalized data")
  }),
  execute: async ({ userId }) => {
    return {
      healthPlan: {
        name: "Premium PPO Plan",
        deductibleUsed: 750,
        deductibleTotal: 1500,
        outOfPocketUsed: 1200,
        outOfPocketMax: 5000
      },
      coverageTypes: [
        { type: "Medical", status: "active", monthlyPremium: 450 },
        { type: "Dental", status: "active", monthlyPremium: 45 },
        { type: "Vision", status: "active", monthlyPremium: 15 },
        { type: "Life", status: "active", monthlyPremium: 25 },
        { type: "401k", status: "active", monthlyPremium: 0 },
        { type: "HSA", status: "active", monthlyPremium: 0 }
      ],
      upcomingDeadlines: [
        { event: "Open Enrollment Ends", date: "November 15, 2024", daysRemaining: 14 },
        { event: "FSA Claim Deadline", date: "December 31, 2024", daysRemaining: 60 }
      ],
      savingsOpportunity: {
        amount: 1200,
        recommendation: "Consider switching to HDHP with HSA for tax savings"
      }
    };
  }
});