import type { InferUITool } from 'ai';
import type { compareBenefitsPlans } from '@/lib/ai/tools/compare-benefits-plans';
import type { calculateTaxSavings } from '@/lib/ai/tools/calculate-tax-savings';

// Define the tool types for our custom benefits tools
export type CompareBenefitsPlansTool = InferUITool<typeof compareBenefitsPlans>;
export type CalculateTaxSavingsTool = InferUITool<typeof calculateTaxSavings>;

// Extended tool types that include our custom tools
export type ExtendedChatTools = {
  compareBenefitsPlans: CompareBenefitsPlansTool;
  calculateTaxSavings: CalculateTaxSavingsTool;
};

// Type guards for custom tool parts
export function isCompareBenefitsPlansToolPart(part: any): part is {
  type: 'tool-compareBenefitsPlans';
  toolCallId: string;
  state: 'input-available' | 'output-available';
  input?: any;
  output?: any;
} {
  return part.type === 'tool-compareBenefitsPlans';
}

export function isCalculateTaxSavingsToolPart(part: any): part is {
  type: 'tool-calculateTaxSavings';
  toolCallId: string;
  state: 'input-available' | 'output-available';
  input?: any;
  output?: any;
} {
  return part.type === 'tool-calculateTaxSavings';
}
