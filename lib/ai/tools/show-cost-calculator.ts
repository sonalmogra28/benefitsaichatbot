import { tool } from 'ai';
import { z } from 'zod';

export const showCostCalculator = tool({
  description: "Show an interactive cost calculator for benefits",
  inputSchema: z.object({
    initialPlan: z.string().optional().describe("Initial plan type to pre-populate")
  }),
  execute: async ({ initialPlan }) => {
    // This tool returns a signal to show the interactive calculator
    return {
      showCalculator: true,
      initialPlan: initialPlan || null,
      message: "Here's an interactive cost calculator to help estimate your benefits costs. Fill out the form to get personalized estimates."
    };
  }
});