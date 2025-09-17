import { azure } from '@ai-sdk/azure';
import { generateObject } from 'ai';
import { z } from 'zod';

// Model configurations with cost estimates (per 1M tokens)
const MODEL_CONFIGS = {
  'gpt-4o-mini': {
    provider: azure,
    model: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-4o-mini',
    costPer1MInput: 0.5,
    costPer1MOutput: 1.5,
    maxTokens: 16385,
    capabilities: ['simple_qa', 'basic_chat', 'faq'],
  },
  'gpt-4o': {
    provider: azure,
    model: process.env.AZURE_OPENAI_COMPLEX_DEPLOYMENT || 'gpt-4o',
    costPer1MInput: 10.0,
    costPer1MOutput: 30.0,
    maxTokens: 128000,
    capabilities: ['complex_reasoning', 'analysis', 'creative', 'technical'],
  },
} as const;

// Query complexity analysis schema
const QueryComplexitySchema = z.object({
  complexity: z.enum(['simple', 'moderate', 'complex']),
  category: z.enum(['faq', 'benefits', 'technical', 'creative', 'analysis']),
  estimatedTokens: z.number().min(1).max(10000),
  requiresReasoning: z.boolean(),
  requiresContext: z.boolean(),
  confidence: z.number().min(0).max(1),
});

type QueryComplexity = z.infer<typeof QueryComplexitySchema>;

// Routing rules based on complexity and cost optimization
const ROUTING_RULES = {
  simple: {
    primary: 'gpt-4o-mini',
    fallback: 'gpt-4o-mini',
    threshold: 0.8, // 80% of simple queries go to flash
  },
  moderate: {
    primary: 'gpt-4o-mini',
    fallback: 'gpt-4o',
    threshold: 0.6, // 60% of moderate queries go to flash
  },
  complex: {
    primary: 'gpt-4o',
    fallback: 'gpt-4o',
    threshold: 0.7, // 70% of complex queries go to pro
  },
} as const;

class HybridLLMRouter {
  private usageStats = {
    totalQueries: 0,
    modelUsage: {} as Record<string, number>,
    costSavings: 0,
    averageResponseTime: 0,
  };

  /**
   * Analyze query complexity using a lightweight model
   */
  async analyzeQueryComplexity(query: string, context?: string): Promise<QueryComplexity> {
    try {
      const analysisPrompt = `
Analyze this user query for complexity and routing decisions:

Query: "${query}"
Context: ${context ? `"${context.substring(0, 500)}..."` : 'None'}

Consider:
- Is this a simple FAQ or benefits question?
- Does it require complex reasoning or analysis?
- How much context is needed?
- Estimated token count for response

Respond with JSON matching this schema:
{
  "complexity": "simple" | "moderate" | "complex",
  "category": "faq" | "benefits" | "technical" | "creative" | "analysis",
  "estimatedTokens": number,
  "requiresReasoning": boolean,
  "requiresContext": boolean,
  "confidence": number (0-1)
}`;

      const result = await generateObject({
        model: azure(process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || 'gpt-4o-mini'),
        prompt: analysisPrompt,
        schema: QueryComplexitySchema,
      });

      return result.object;
    } catch (error) {
      logger.error('Query complexity analysis failed:', error);
      // Fallback to simple analysis
      return {
        complexity: 'simple',
        category: 'faq',
        estimatedTokens: 100,
        requiresReasoning: false,
        requiresContext: false,
        confidence: 0.5,
      };
    }
  }

  /**
   * Select the optimal model based on complexity and cost optimization
   */
  selectModel(complexity: QueryComplexity, companyId: string): {
    model: keyof typeof MODEL_CONFIGS;
    reason: string;
  } {
    const { complexity: level, category, estimatedTokens, requiresReasoning } = complexity;
    const rules = ROUTING_RULES[level];
    
    // Check if we should use the primary model based on threshold
    const usePrimary = Math.random() < rules.threshold;
    const selectedModel = usePrimary ? rules.primary : rules.fallback;
    
    // Override for specific cases
    if (category === 'technical' && requiresReasoning) {
      return {
        model: 'gpt-4o',
        reason: 'Technical query requiring reasoning',
      };
    }
    
    if (estimatedTokens > 5000) {
      return {
        model: 'gpt-4o',
        reason: 'Large response expected',
      };
    }
    
    if (category === 'faq' && level === 'simple') {
      return {
        model: 'gpt-4o-mini',
        reason: 'Simple FAQ query',
      };
    }

    return {
      model: selectedModel,
      reason: `${level} complexity query routed to ${selectedModel}`,
    };
  }

  /**
   * Get the model configuration for streaming
   */
  getModelConfig(modelName: keyof typeof MODEL_CONFIGS) {
    const config = MODEL_CONFIGS[modelName];
    return {
      model: config.provider(config.model),
      maxTokens: config.maxTokens,
      costPer1MInput: config.costPer1MInput,
      costPer1MOutput: config.costPer1MOutput,
    };
  }

  /**
   * Route a query to the appropriate model
   */
  async routeQuery(
    query: string,
    context?: string,
    companyId?: string
  ): Promise<{
    model: keyof typeof MODEL_CONFIGS;
    config: ReturnType<typeof this.getModelConfig>;
    reason: string;
    complexity: QueryComplexity;
  }> {
    const complexity = await this.analyzeQueryComplexity(query, context);
    const { model, reason } = this.selectModel(complexity, companyId || 'default');
    const config = this.getModelConfig(model);

    // Update usage stats
    this.usageStats.totalQueries++;
    this.usageStats.modelUsage[model] = (this.usageStats.modelUsage[model] || 0) + 1;

    return {
      model,
      config,
      reason,
      complexity,
    };
  }

  /**
   * Get routing statistics and cost analysis
   */
  getStats() {
    const totalQueries = this.usageStats.totalQueries;
    const modelDistribution = Object.entries(this.usageStats.modelUsage).map(([model, count]) => ({
      model,
      count,
      percentage: totalQueries > 0 ? (count / totalQueries) * 100 : 0,
    }));

    return {
      totalQueries,
      modelDistribution,
      costSavings: this.usageStats.costSavings,
      averageResponseTime: this.usageStats.averageResponseTime,
    };
  }

  /**
   * Reset usage statistics
   */
  resetStats() {
    this.usageStats = {
      totalQueries: 0,
      modelUsage: {},
      costSavings: 0,
      averageResponseTime: 0,
    };
  }

  /**
   * Get cost comparison for different models
   */
  getCostComparison(estimatedTokens: number) {
    return Object.entries(MODEL_CONFIGS).map(([name, config]) => ({
      model: name,
      estimatedCost: (estimatedTokens / 1000000) * (config.costPer1MInput + config.costPer1MOutput),
      costPer1M: config.costPer1MInput + config.costPer1MOutput,
    }));
  }
}

export const hybridLLMRouter = new HybridLLMRouter();
export { MODEL_CONFIGS, ROUTING_RULES };
