import type { InferUITool } from 'ai';
import type { comparePlans } from '@/lib/ai/tools/compare-plans';
import type { calculateSavings } from '@/lib/ai/tools/calculate-savings';

// Define the tool types for our custom benefits tools
export type ComparePlansTool = InferUITool<typeof comparePlans>;
export type CalculateSavingsTool = InferUITool<typeof calculateSavings>;

// Extended tool types that include our custom tools
export type ExtendedChatTools = {
  comparePlans: ComparePlansTool;
  calculateSavings: CalculateSavingsTool;
};

// Type guards for custom tool parts
export function isComparePlansToolPart(part: any): part is {
  type: 'tool-comparePlans';
  toolCallId: string;
  state: 'input-available' | 'output-available';
  input?: any;
  output?: any;
} {
  return part.type === 'tool-comparePlans';
}

export function isCalculateSavingsToolPart(part: any): part is {
  type: 'tool-calculateSavings';
  toolCallId: string;
  state: 'input-available' | 'output-available';
  input?: any;
  output?: any;
} {
  return part.type === 'tool-calculateSavings';
}