import { tool } from 'ai';
import { z } from 'zod';

export const showBenefitsDashboard = tool({
  description: "Show a comprehensive benefits dashboard",
  inputSchema: z.object({
    userId: z.string().optional().describe("User ID for personalized data")
  }),
  execute: async ({ userId }) => {
    // In production, this would fetch from database
    // For demo, return rich sample data
    return {
      healthPlan: {
        name: "Premium PPO Plan",
        type: "PPO",
        deductibleUsed: 750,
        deductibleTotal: 1500,
        outOfPocketUsed: 1850,
        outOfPocketMax: 5000,
        premiumPaid: 5400,
        premiumTotal: 6600
      },
      coverageTypes: [
        { type: "Medical", status: "active", monthlyPremium: 450, coverageLevel: "Employee + Family" },
        { type: "Dental", status: "active", monthlyPremium: 65, coverageLevel: "Employee + Family" },
        { type: "Vision", status: "active", monthlyPremium: 25, coverageLevel: "Employee + Family" },
        { type: "Life", status: "active", monthlyPremium: 35, coverageLevel: "2x Annual Salary" },
        { type: "401k", status: "active", monthlyPremium: 0, coverageLevel: "6% Match" },
        { type: "HSA", status: "not-enrolled", monthlyPremium: 0, coverageLevel: "Not Available with PPO" }
      ],
      upcomingDeadlines: [
        { event: "Open Enrollment Ends", date: "November 15, 2024", daysRemaining: 14 },
        { event: "FSA Claim Deadline", date: "March 15, 2025", daysRemaining: 127 },
        { event: "Wellness Check Deadline", date: "December 31, 2024", daysRemaining: 60 }
      ],
      savingsOpportunity: {
        amount: 1800,
        recommendation: "Consider switching to HDHP with HSA for tax savings based on your low healthcare usage"
      },
      recentActivity: [
        { date: "Oct 15", description: "Primary care visit", amount: 30 },
        { date: "Sep 28", description: "Prescription filled", amount: 15 },
        { date: "Sep 10", description: "Dental cleaning", amount: 0 }
      ]
    };
  }
});