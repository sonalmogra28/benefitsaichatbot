import { tool } from 'ai';
import { z } from 'zod';

export const showCostCalculator = tool({
  description:
    'Show an interactive cost calculator for estimating healthcare expenses',
  inputSchema: z.object({
    currentPlanType: z.string().optional().describe("User's current plan type"),
  }),
  execute: async ({ currentPlanType }: { currentPlanType?: string }) => {
    return {
      plans: [
        {
          name: 'Essential HMO',
          type: 'HMO',
          monthlyPremium: 325,
          deductible: 2500,
          outOfPocketMax: 7000,
          coinsurance: 20,
          copayPrimary: 30,
          copaySpecialist: 60,
          copayER: 350,
          copayUrgent: 75,
          prescriptionTiers: {
            generic: 10,
            preferred: 35,
            nonPreferred: 75,
            specialty: '20% after deductible',
          },
        },
        {
          name: 'Choice PPO',
          type: 'PPO',
          monthlyPremium: 525,
          deductible: 1000,
          outOfPocketMax: 5000,
          coinsurance: 15,
          copayPrimary: 20,
          copaySpecialist: 40,
          copayER: 250,
          copayUrgent: 50,
          prescriptionTiers: {
            generic: 5,
            preferred: 25,
            nonPreferred: 50,
            specialty: '15% after deductible',
          },
        },
        {
          name: 'Saver HDHP + HSA',
          type: 'HDHP',
          monthlyPremium: 225,
          deductible: 4000,
          outOfPocketMax: 8000,
          coinsurance: 20,
          copayPrimary: 0,
          copaySpecialist: 0,
          copayER: 0,
          copayUrgent: 0,
          prescriptionTiers: {
            generic: 'After deductible',
            preferred: 'After deductible',
            nonPreferred: 'After deductible',
            specialty: 'After deductible',
          },
          hsaDetails: {
            employerContribution: 750,
            maxContribution: 4150,
            taxSavings: '~25-35% of contributions',
          },
        },
      ],
      assumptions: {
        averagePrimaryCost: 150,
        averageSpecialistCost: 300,
        averageERCost: 2000,
        averageUrgentCost: 200,
        averageGenericRx: 75,
      },
    };
  },
});
