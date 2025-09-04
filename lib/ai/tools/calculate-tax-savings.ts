import { tool } from 'ai';
import { z } from 'zod';

export const calculateTaxSavings = tool({
  description:
    'Calculate potential savings from benefits decisions like HSA contributions, plan changes, or retirement contributions',
  inputSchema: z.object({
    calculationType: z
      .enum(['hsa', 'planChange', 'retirement', 'fsa'])
      .describe('Type of savings calculation'),
    currentSituation: z
      .object({
        monthlyPremium: z
          .number()
          .optional()
          .describe('Current monthly premium'),
        annualDeductible: z
          .number()
          .optional()
          .describe('Current annual deductible'),
        monthlyContribution: z
          .number()
          .optional()
          .describe('Current monthly contribution (HSA/401k)'),
        taxBracket: z
          .number()
          .optional()
          .describe('Current tax bracket (as decimal, e.g., 0.22 for 22%)'),
        annualIncome: z.number().optional().describe('Annual income'),
        currentExpenses: z
          .number()
          .optional()
          .describe('Current annual medical/eligible expenses'),
      })
      .describe('Current financial situation'),
    proposedSituation: z
      .object({
        monthlyPremium: z
          .number()
          .optional()
          .describe('Proposed monthly premium'),
        annualDeductible: z
          .number()
          .optional()
          .describe('Proposed annual deductible'),
        monthlyContribution: z
          .number()
          .optional()
          .describe('Proposed monthly contribution (HSA/401k)'),
        taxBracket: z
          .number()
          .optional()
          .describe('Proposed tax bracket (as decimal)'),
        annualIncome: z.number().optional().describe('Proposed annual income'),
        proposedExpenses: z
          .number()
          .optional()
          .describe('Proposed annual medical/eligible expenses'),
      })
      .describe('Proposed financial situation'),
    timeframe: z
      .enum(['annual', '5year', '10year', '30year'])
      .optional()
      .default('annual')
      .describe('Timeframe for savings calculation'),
    additionalFactors: z
      .object({
        employerMatch: z
          .number()
          .optional()
          .describe('Employer 401k match percentage'),
        compoundInterestRate: z
          .number()
          .optional()
          .describe('Expected investment return rate'),
        inflationRate: z
          .number()
          .optional()
          .describe('Expected inflation rate'),
        familySize: z.number().optional().describe('Number of family members'),
      })
      .optional()
      .describe('Additional factors for calculation'),
  }),
  execute: async ({
    calculationType,
    currentSituation,
    proposedSituation,
    timeframe,
    additionalFactors,
  }: {
    calculationType: string;
    currentSituation: any;
    proposedSituation: any;
    timeframe?: string;
    additionalFactors?: any;
  }) => {
    const timeMultiplier =
      timeframe === 'annual'
        ? 1
        : timeframe === '5year'
          ? 5
          : timeframe === '10year'
            ? 10
            : 30;

    let calculations: any = {
      calculationType,
      timeframe,
      currentAnnualCost: 0,
      proposedAnnualCost: 0,
      annualSavings: 0,
      totalSavings: 0,
      breakdown: [],
      taxSavings: 0,
      netSavings: 0,
    };

    switch (calculationType) {
      case 'hsa': {
        const currentHSAContribution =
          (currentSituation.monthlyContribution || 0) * 12;
        const proposedHSAContribution =
          (proposedSituation.monthlyContribution || 0) * 12;
        const contributionIncrease =
          proposedHSAContribution - currentHSAContribution;

        // HSA triple tax advantage
        const taxSavings =
          contributionIncrease * (currentSituation.taxBracket || 0.22);
        const payrollTaxSavings = contributionIncrease * 0.0765; // Social Security + Medicare
        const annualTaxSavings = taxSavings + payrollTaxSavings;

        // Investment growth (assuming 7% annual return)
        const growthRate = additionalFactors?.compoundInterestRate || 0.07;
        const futureValue =
          contributionIncrease *
          (((1 + growthRate) ** timeMultiplier - 1) / growthRate);

        calculations = {
          ...calculations,
          currentAnnualCost: currentHSAContribution,
          proposedAnnualCost: proposedHSAContribution,
          annualSavings: annualTaxSavings,
          totalSavings: Math.round(
            futureValue + annualTaxSavings * timeMultiplier,
          ),
          taxSavings: Math.round(annualTaxSavings),
          netSavings: Math.round(contributionIncrease - annualTaxSavings),
          breakdown: [
            {
              item: 'Additional HSA Contribution',
              amount: contributionIncrease,
            },
            { item: 'Federal Tax Savings', amount: Math.round(taxSavings) },
            {
              item: 'Payroll Tax Savings',
              amount: Math.round(payrollTaxSavings),
            },
            {
              item: `Investment Growth (over ${timeframe})`,
              amount: Math.round(futureValue - contributionIncrease),
            },
          ],
        };
        break;
      }

      case 'planChange': {
        const currentPremium = (currentSituation.monthlyPremium || 0) * 12;
        const proposedPremium = (proposedSituation.monthlyPremium || 0) * 12;
        const premiumDifference = currentPremium - proposedPremium;

        // Estimate total cost including typical usage
        const currentEstimatedUsage =
          (currentSituation.annualDeductible || 0) * 0.3; // 30% of deductible
        const proposedEstimatedUsage =
          (proposedSituation.annualDeductible || 0) * 0.3;

        const currentTotalCost = currentPremium + currentEstimatedUsage;
        const proposedTotalCost = proposedPremium + proposedEstimatedUsage;
        const totalAnnualSavings = currentTotalCost - proposedTotalCost;

        calculations = {
          ...calculations,
          currentAnnualCost: Math.round(currentTotalCost),
          proposedAnnualCost: Math.round(proposedTotalCost),
          annualSavings: Math.round(totalAnnualSavings),
          totalSavings: Math.round(totalAnnualSavings * timeMultiplier),
          breakdown: [
            { item: 'Premium Savings', amount: Math.round(premiumDifference) },
            {
              item: 'Deductible Difference Impact',
              amount: Math.round(
                currentEstimatedUsage - proposedEstimatedUsage,
              ),
            },
            {
              item: 'Net Annual Savings',
              amount: Math.round(totalAnnualSavings),
            },
          ],
        };
        break;
      }

      case 'retirement': {
        const currentRetirementContribution =
          (currentSituation.monthlyContribution || 0) * 12;
        const proposedRetirementContribution =
          (proposedSituation.monthlyContribution || 0) * 12;
        const retirementIncrease =
          proposedRetirementContribution - currentRetirementContribution;

        // Tax savings
        const retirementTaxSavings =
          retirementIncrease * (currentSituation.taxBracket || 0.22);

        // Employer match
        const employerMatch = Math.min(
          retirementIncrease * (additionalFactors?.employerMatch || 0),
          retirementIncrease,
        );

        // Investment growth
        const retirementGrowthRate =
          additionalFactors?.compoundInterestRate || 0.07;
        const totalContributions = retirementIncrease + employerMatch;
        const retirementFutureValue =
          totalContributions *
          (((1 + retirementGrowthRate) ** timeMultiplier - 1) /
            retirementGrowthRate);

        calculations = {
          ...calculations,
          currentAnnualCost: currentRetirementContribution,
          proposedAnnualCost: proposedRetirementContribution,
          annualSavings: Math.round(retirementTaxSavings + employerMatch),
          totalSavings: Math.round(retirementFutureValue),
          taxSavings: Math.round(retirementTaxSavings),
          netSavings: Math.round(retirementIncrease - retirementTaxSavings),
          breakdown: [
            {
              item: 'Additional Contribution',
              amount: Math.round(retirementIncrease),
            },
            { item: 'Tax Savings', amount: Math.round(retirementTaxSavings) },
            { item: 'Employer Match', amount: Math.round(employerMatch) },
            {
              item: `Investment Growth (over ${timeframe})`,
              amount: Math.round(retirementFutureValue - totalContributions),
            },
          ],
        };
        break;
      }

      case 'fsa': {
        const currentFSAContribution =
          (currentSituation.monthlyContribution || 0) * 12;
        const proposedFSAContribution =
          (proposedSituation.monthlyContribution || 0) * 12;
        const fsaIncrease = proposedFSAContribution - currentFSAContribution;

        // FSA tax savings
        const fsaTaxSavings =
          fsaIncrease * (currentSituation.taxBracket || 0.22);
        const fsaPayrollTaxSavings = fsaIncrease * 0.0765;
        const totalFSASavings = fsaTaxSavings + fsaPayrollTaxSavings;

        calculations = {
          ...calculations,
          currentAnnualCost: currentFSAContribution,
          proposedAnnualCost: proposedFSAContribution,
          annualSavings: Math.round(totalFSASavings),
          totalSavings: Math.round(totalFSASavings * timeMultiplier),
          taxSavings: Math.round(totalFSASavings),
          netSavings: Math.round(fsaIncrease - totalFSASavings),
          breakdown: [
            {
              item: 'Additional FSA Contribution',
              amount: Math.round(fsaIncrease),
            },
            { item: 'Federal Tax Savings', amount: Math.round(fsaTaxSavings) },
            {
              item: 'Payroll Tax Savings',
              amount: Math.round(fsaPayrollTaxSavings),
            },
            {
              item: 'Net Cost After Tax Savings',
              amount: Math.round(fsaIncrease - totalFSASavings),
            },
          ],
        };
        break;
      }
    }

    return {
      ...calculations,
      recommendations: [
        {
          action:
            calculationType === 'hsa'
              ? 'Maximize HSA contributions'
              : calculationType === 'retirement'
                ? 'Increase retirement contributions'
                : calculationType === 'planChange'
                  ? 'Switch to recommended plan'
                  : 'Optimize FSA contributions',
          impact: `Save $${Math.abs(calculations.annualSavings).toLocaleString()} annually`,
          urgency:
            calculations.annualSavings > 1000
              ? 'high'
              : calculations.annualSavings > 500
                ? 'medium'
                : 'low',
        },
      ],
      assumptions: [
        `Tax bracket: ${((currentSituation.taxBracket || 0.22) * 100).toFixed(0)}%`,
        `Investment return: ${((additionalFactors?.compoundInterestRate || 0.07) * 100).toFixed(1)}%`,
        `Timeframe: ${timeframe}`,
        'Calculations are estimates based on current tax law and typical usage patterns',
      ],
    };
  },
});
