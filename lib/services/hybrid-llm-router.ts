// lib/services/hybrid-llm-router.ts - Cost-Optimized LLM Routing
import { logger } from '@/lib/logger';
import { azureOpenAIService } from '@/lib/services/azure-openai';
import { analyticsService } from '@/lib/services/analytics';

export interface LLMRequest {
  message: string;
  userId: string;
  conversationId?: string;
  context?: any;
  priority?: 'low' | 'medium' | 'high';
}

export interface LLMResponse {
  content: string;
  metadata: {
    model: string;
    tokens: number;
    cost: number;
    responseTime: number;
    confidence: number;
  };
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ModelConfig {
  name: string;
  costPerToken: number;
  maxTokens: number;
  capabilities: string[];
  priority: number;
}

class HybridLLMRouter {
  private models: ModelConfig[] = [
    {
      name: 'gpt-4o-mini',
      costPerToken: 0.00015, // $0.15 per 1K tokens
      maxTokens: 128000,
      capabilities: ['general', 'benefits', 'hr'],
      priority: 1 // Lowest cost
    },
    {
      name: 'gpt-4o',
      costPerToken: 0.0030, // $3.00 per 1K tokens
      maxTokens: 128000,
      capabilities: ['complex', 'analysis', 'reasoning'],
      priority: 2 // Higher cost but better quality
    }
  ];

  private cache = new Map<string, { response: LLMResponse; timestamp: number }>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes

  async processMessage(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        logger.info('Cache hit for LLM request', { userId: request.userId, cacheKey });
        return cached;
      }

      // Analyze request complexity and route to appropriate model
      const requestAnalysis = this.analyzeRequest(request);
      const selectedModel = this.selectModel(requestAnalysis);

      logger.info('LLM routing decision', {
        userId: request.userId,
        complexity: requestAnalysis.complexity,
        selectedModel: selectedModel.name,
        estimatedCost: requestAnalysis.estimatedTokens * selectedModel.costPerToken
      });

      // Process with selected model
      const response = await this.callModel(selectedModel, request);
      
      // Cache successful responses
      this.cacheResponse(cacheKey, response);

      // Track analytics
      await this.trackUsage(request, response, selectedModel, startTime);

      return response;

    } catch (error) {
      logger.error('LLM routing error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: request.userId,
        message: request.message.substring(0, 100)
      });

      // Fallback to cheapest model on error
      const fallbackModel = this.models[0];
      try {
        const fallbackResponse = await this.callModel(fallbackModel, request);
        await this.trackUsage(request, fallbackResponse, fallbackModel, startTime, true);
        return fallbackResponse;
      } catch (fallbackError) {
        logger.error('Fallback model also failed', {
          error: fallbackError instanceof Error ? fallbackError.message : 'Unknown error',
          userId: request.userId
        });
        throw new Error('All LLM services unavailable');
      }
    }
  }

  private analyzeRequest(request: LLMRequest): RequestAnalysis {
    const message = request.message.toLowerCase();
    const wordCount = request.message.split(' ').length;
    
    // Complexity indicators
    const complexityIndicators = [
      'analyze', 'compare', 'explain detailed', 'breakdown', 'comprehensive',
      'complex', 'detailed analysis', 'in-depth', 'thorough review'
    ];
    
    const simpleIndicators = [
      'what is', 'how much', 'when', 'where', 'yes', 'no', 'quick question'
    ];

    let complexity: 'simple' | 'medium' | 'complex' = 'medium';
    let estimatedTokens = Math.max(100, wordCount * 1.5); // Rough estimate

    if (simpleIndicators.some(indicator => message.includes(indicator)) && wordCount < 20) {
      complexity = 'simple';
      estimatedTokens = Math.min(estimatedTokens, 500);
    } else if (complexityIndicators.some(indicator => message.includes(indicator)) || wordCount > 50) {
      complexity = 'complex';
      estimatedTokens = Math.max(estimatedTokens, 1000);
    }

    // Benefits-specific routing
    const benefitsKeywords = ['benefits', 'insurance', '401k', 'pto', 'healthcare', 'dental', 'vision'];
    const isBenefitsQuery = benefitsKeywords.some(keyword => message.includes(keyword));

    return {
      complexity,
      estimatedTokens,
      isBenefitsQuery,
      priority: request.priority || 'medium',
      requiresRealTime: message.includes('current') || message.includes('today'),
      category: this.categorizeRequest(message)
    };
  }

  private selectModel(analysis: RequestAnalysis): ModelConfig {
    // Simple queries -> cheapest model
    if (analysis.complexity === 'simple' && analysis.estimatedTokens < 500) {
      return this.models[0]; // gpt-4o-mini
    }

    // Complex analysis or high priority -> better model
    if (analysis.complexity === 'complex' || analysis.priority === 'high') {
      return this.models[1]; // gpt-4o
    }

    // Default to cost-effective model
    return this.models[0];
  }

  private async callModel(model: ModelConfig, request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();

    const response = await azureOpenAIService.createChatCompletion({
      model: model.name,
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(request)
        },
        {
          role: 'user',
          content: request.message
        }
      ],
      maxTokens: Math.min(model.maxTokens, 4000),
      temperature: 0.7,
      user: request.userId
    });

    const responseTime = Date.now() - startTime;
    const totalTokens = response.usage?.totalTokens || 0;

    return {
      content: response.choices[0]?.message?.content || '',
      metadata: {
        model: model.name,
        tokens: totalTokens,
        cost: totalTokens * model.costPerToken,
        responseTime,
        confidence: this.calculateConfidence(response)
      },
      usage: {
        promptTokens: response.usage?.promptTokens || 0,
        completionTokens: response.usage?.completionTokens || 0,
        totalTokens
      }
    };
  }

  private getSystemPrompt(request: LLMRequest): string {
    const basePrompt = `You are a helpful benefits AI assistant. Provide accurate, concise information about employee benefits, HR policies, and workplace topics.`;
    
    if (request.context?.companyName) {
      return `${basePrompt} You are assisting employees at ${request.context.companyName}.`;
    }
    
    return basePrompt;
  }

  private calculateConfidence(response: any): number {
    // Simple confidence calculation based on response characteristics
    const content = response.choices[0]?.message?.content || '';
    const finishReason = response.choices[0]?.finishReason;
    
    let confidence = 0.8; // Base confidence
    
    if (finishReason === 'stop') confidence += 0.1;
    if (content.length > 50) confidence += 0.05;
    if (!content.includes('I don\'t know') && !content.includes('uncertain')) confidence += 0.05;
    
    return Math.min(confidence, 1.0);
  }

  private categorizeRequest(message: string): string {
    const categories = {
      'benefits': ['benefits', 'insurance', 'healthcare', 'dental', 'vision', '401k', 'retirement'],
      'pto': ['pto', 'vacation', 'time off', 'sick leave', 'holiday'],
      'hr': ['hr', 'human resources', 'policy', 'handbook', 'procedure'],
      'payroll': ['payroll', 'salary', 'pay', 'compensation', 'bonus'],
      'general': []
    };

    const lowerMessage = message.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return category;
      }
    }
    
    return 'general';
  }

  private generateCacheKey(request: LLMRequest): string {
    const key = `${request.message}_${request.userId}_${JSON.stringify(request.context)}`;
    return Buffer.from(key).toString('base64').substring(0, 32);
  }

  private getCachedResponse(key: string): LLMResponse | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.response;
  }

  private cacheResponse(key: string, response: LLMResponse): void {
    this.cache.set(key, {
      response,
      timestamp: Date.now()
    });

    // Clean old cache entries periodically
    if (this.cache.size > 1000) {
      const cutoff = Date.now() - this.CACHE_TTL;
      for (const [k, v] of this.cache.entries()) {
        if (v.timestamp < cutoff) {
          this.cache.delete(k);
        }
      }
    }
  }

  private async trackUsage(
    request: LLMRequest,
    response: LLMResponse,
    model: ModelConfig,
    startTime: number,
    isFallback: boolean = false
  ): Promise<void> {
    try {
      await analyticsService.trackLLMUsage({
        userId: request.userId,
        conversationId: request.conversationId,
        model: model.name,
        tokens: response.usage.totalTokens,
        cost: response.metadata.cost,
        responseTime: response.metadata.responseTime,
        category: this.categorizeRequest(request.message),
        isFallback,
        timestamp: new Date(startTime)
      });
    } catch (error) {
      logger.error('Failed to track LLM usage', { error });
    }
  }
}

interface RequestAnalysis {
  complexity: 'simple' | 'medium' | 'complex';
  estimatedTokens: number;
  isBenefitsQuery: boolean;
  priority: 'low' | 'medium' | 'high';
  requiresRealTime: boolean;
  category: string;
}

export const hybridLLMRouter = new HybridLLMRouter();