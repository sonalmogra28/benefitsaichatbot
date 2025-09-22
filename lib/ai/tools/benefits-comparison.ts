/**
 * Benefits Comparison AI Tools
 * Integrates with real Amerivet benefits data
 */

import { AMERIVET_BENEFIT_PLANS, getPlansByType, getPlansByRegion, calculateEmployeeCost } from '@/lib/data/amerivet-benefits';

export const benefitsComparisonTools = {
  comparePlans: {
    description: 'Compare different benefit plans side by side',
    parameters: {
      type: 'object',
      properties: {
        planIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of plan IDs to compare',
        },
        coverageTier: {
          type: 'string',
          enum: ['employee', 'employee+spouse', 'employee+children', 'employee+family'],
          description: 'Coverage tier for cost calculation',
        },
        region: {
          type: 'string',
          description: 'Employee region (california, oregon, washington, nationwide)',
        },
      },
      required: ['planIds'],
    },
    execute: async ({ planIds, coverageTier = 'employee', region }: {
      planIds: string[];
      coverageTier?: string;
      region?: string;
    }) => {
      const plans = planIds.map(id => AMERIVET_BENEFIT_PLANS.find(plan => plan.id === id)).filter(Boolean);
      
      if (plans.length === 0) {
        return { error: 'No valid plans found' };
      }

      // Filter by region if specified
      const filteredPlans = region ? getPlansByRegion(region) : plans;
      const availablePlans = filteredPlans.filter(plan => plan && planIds.includes(plan.id));

      const comparison = availablePlans.map(plan => {
        if (!plan) return null;
        return {
          id: plan.id,
          name: plan.name,
          type: plan.type,
          provider: plan.provider,
          monthlyCost: calculateEmployeeCost(plan.id, coverageTier as any),
          deductibles: plan.coverage.deductibles,
          coinsurance: plan.coverage.coinsurance,
          copays: plan.coverage.copays,
          outOfPocketMax: plan.coverage.outOfPocketMax,
          features: plan.features,
          exclusions: plan.exclusions,
          regionalRestrictions: plan.regionalRestrictions,
        };
      }).filter(Boolean);

      return {
        comparison,
        coverageTier,
        region,
        totalPlans: comparison.length,
      };
    },
  },

  getPlansByType: {
    description: 'Get all available plans of a specific type',
    parameters: {
      type: 'object',
      properties: {
        planType: {
          type: 'string',
          enum: ['medical', 'dental', 'vision', 'life', 'disability', 'voluntary'],
          description: 'Type of benefit plan',
        },
        region: {
          type: 'string',
          description: 'Employee region for filtering',
        },
      },
      required: ['planType'],
    },
    execute: async ({ planType, region }: { planType: string; region?: string }) => {
      let plans = getPlansByType(planType as any);
      
      if (region) {
        plans = plans.filter(plan => 
          !plan.regionalRestrictions || 
          plan.regionalRestrictions.some(r => r.toLowerCase().includes(region.toLowerCase()))
        );
      }

      return {
        plans: plans.map(plan => ({
          id: plan.id,
          name: plan.name,
          provider: plan.provider,
          monthlyCost: plan.premiums.employee.monthly,
          coverage: plan.coverage,
          features: plan.features,
        })),
        planType,
        region,
        totalPlans: plans.length,
      };
    },
  },

  calculateTotalCost: {
    description: 'Calculate total monthly cost for selected benefit plans',
    parameters: {
      type: 'object',
      properties: {
        selectedPlans: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              planId: { type: 'string' },
              coverageTier: { type: 'string' },
            },
            required: ['planId', 'coverageTier'],
          },
          description: 'Array of selected plans with coverage tiers',
        },
      },
      required: ['selectedPlans'],
    },
    execute: async ({ selectedPlans }: { selectedPlans: Array<{ planId: string; coverageTier: string }> }) => {
      const costs = selectedPlans.map(({ planId, coverageTier }) => {
        const plan = AMERIVET_BENEFIT_PLANS.find(p => p.id === planId);
        if (!plan) return { planId, cost: 0, error: 'Plan not found' };
        
        return {
          planId,
          planName: plan.name,
          coverageTier,
          monthlyCost: calculateEmployeeCost(planId, coverageTier as any),
        };
      });

      const totalMonthlyCost = costs.reduce((sum, cost) => sum + (cost.monthlyCost || 0), 0);
      const totalAnnualCost = totalMonthlyCost * 12;

      return {
        costs,
        totalMonthlyCost,
        totalAnnualCost,
        planCount: selectedPlans.length,
      };
    },
  },

  getEligibilityInfo: {
    description: 'Get eligibility information for benefits',
    parameters: {
      type: 'object',
      properties: {
        employeeType: {
          type: 'string',
          enum: ['full-time', 'part-time'],
          description: 'Employee type',
        },
        hoursPerWeek: {
          type: 'number',
          description: 'Hours worked per week',
        },
      },
      required: ['employeeType', 'hoursPerWeek'],
    },
    execute: async ({ employeeType, hoursPerWeek }: { employeeType: string; hoursPerWeek: number }) => {
      const isEligible = employeeType === 'full-time' && hoursPerWeek >= 30;
      const eligiblePlans = isEligible ? AMERIVET_BENEFIT_PLANS : [];
      const voluntaryPlans = AMERIVET_BENEFIT_PLANS.filter(plan => 
        plan.type === 'voluntary' && hoursPerWeek >= 20
      );

      return {
        isEligible,
        employeeType,
        hoursPerWeek,
        eligiblePlans: eligiblePlans.map(plan => ({
          id: plan.id,
          name: plan.name,
          type: plan.type,
        })),
        voluntaryPlans: voluntaryPlans.map(plan => ({
          id: plan.id,
          name: plan.name,
          type: plan.type,
        })),
        waitingPeriod: '1st of month following hire date',
        dependentEligibility: {
          spouse: true,
          domesticPartner: true,
          children: 'Under 26, regardless of marital/residence/student status',
        },
      };
    },
  },

  getOpenEnrollmentInfo: {
    description: 'Get open enrollment information and deadlines',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async () => {
      return {
        year: '2024-2025',
        startDate: 'TBD', // Brandon needs to provide
        endDate: 'TBD', // Brandon needs to provide
        effectiveDate: '2024-10-01',
        specialEffectiveDates: {
          hsa: '2025-01-01',
          fsa: '2025-01-01',
          commuter: '2025-01-01',
        },
        status: 'Open enrollment dates pending confirmation from Brandon',
        actionRequired: 'Contact Brandon for exact open enrollment dates',
      };
    },
  },
};
