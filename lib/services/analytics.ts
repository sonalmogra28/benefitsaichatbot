// lib/services/analytics.ts - Real-time Analytics Implementation
import { logger } from '@/lib/logger';
import { cosmosClient } from '@/lib/azure/cosmos';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

export interface LLMUsageEvent {
  userId: string;
  conversationId?: string;
  model: string;
  tokens: number;
  cost: number;
  responseTime: number;
  category: string;
  isFallback: boolean;
  timestamp: Date;
}

export interface UserInteractionEvent {
  userId: string;
  action: string;
  category: string;
  data?: any;
  timestamp: Date;
}

export interface AnalyticsMetrics {
  totalUsers: number;
  activeUsers: number;
  totalConversations: number;
  avgResponseTime: number;
  totalCost: number;
  topCategories: Array<{ category: string; count: number }>;
  costByModel: Array<{ model: string; cost: number }>;
}

class AnalyticsService {
  private container = cosmosClient.database('BenefitsDB').container('analytics');
  private appInsights: ApplicationInsights;

  constructor() {
    // Initialize Application Insights
    this.appInsights = new ApplicationInsights({
      config: {
        connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
        enableAutoRouteTracking: true,
        enableCorsCorrelation: true,
        enableRequestHeaderTracking: true,
        enableResponseHeaderTracking: true,
      }
    });
    
    if (typeof window !== 'undefined') {
      this.appInsights.loadAppInsights();
    }
  }

  async trackLLMUsage(event: LLMUsageEvent): Promise<void> {
    try {
      // Store in Cosmos DB for detailed analytics
      await this.container.items.create({
        ...event,
        id: crypto.randomUUID(),
        type: 'llm_usage',
        partitionKey: event.userId
      });

      // Send to Application Insights for real-time monitoring
      if (typeof window !== 'undefined') {
        this.appInsights.trackEvent('LLM_Usage', {
          userId: event.userId,
          model: event.model,
          category: event.category,
          isFallback: event.isFallback.toString()
        }, {
          tokens: event.tokens,
          cost: event.cost,
          responseTime: event.responseTime
        });
      }

      logger.info('LLM usage tracked', {
        userId: event.userId,
        model: event.model,
        cost: event.cost,
        tokens: event.tokens
      });

    } catch (error) {
      logger.error('Failed to track LLM usage', {
        error: error instanceof Error ? error.message : 'Unknown error',
        event
      });
    }
  }

  async trackUserInteraction(event: UserInteractionEvent): Promise<void> {
    try {
      await this.container.items.create({
        ...event,
        id: crypto.randomUUID(),
        type: 'user_interaction',
        partitionKey: event.userId
      });

      if (typeof window !== 'undefined') {
        this.appInsights.trackEvent('User_Interaction', {
          userId: event.userId,
          action: event.action,
          category: event.category
        });
      }

    } catch (error) {
      logger.error('Failed to track user interaction', { error, event });
    }
  }

  async getAnalyticsMetrics(
    startDate: Date,
    endDate: Date,
    companyId?: string
  ): Promise<AnalyticsMetrics> {
    try {
      const baseQuery = `
        SELECT *
        FROM c
        WHERE c.timestamp >= @startDate
        AND c.timestamp <= @endDate
        ${companyId ? 'AND c.companyId = @companyId' : ''}
      `;

      const parameters = [
        { name: '@startDate', value: startDate.toISOString() },
        { name: '@endDate', value: endDate.toISOString() }
      ];

      if (companyId) {
        parameters.push({ name: '@companyId', value: companyId });
      }

      const { resources } = await this.container.items.query({
        query: baseQuery,
        parameters
      }).fetchAll();

      return this.processMetrics(resources);

    } catch (error) {
      logger.error('Failed to get analytics metrics', { error, startDate, endDate, companyId });
      throw error;
    }
  }

  private processMetrics(events: any[]): AnalyticsMetrics {
    const llmEvents = events.filter(e => e.type === 'llm_usage');
    const userEvents = events.filter(e => e.type === 'user_interaction');

    const uniqueUsers = new Set(events.map(e => e.userId)).size;
    const totalConversations = new Set(llmEvents.map(e => e.conversationId)).size;
    const totalCost = llmEvents.reduce((sum, e) => sum + (e.cost || 0), 0);
    const avgResponseTime = llmEvents.length > 0 
      ? llmEvents.reduce((sum, e) => sum + (e.responseTime || 0), 0) / llmEvents.length 
      : 0;

    // Category analysis
    const categoryCount = new Map<string, number>();
    llmEvents.forEach(e => {
      const count = categoryCount.get(e.category) || 0;
      categoryCount.set(e.category, count + 1);
    });

    const topCategories = Array.from(categoryCount.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Cost by model analysis
    const modelCost = new Map<string, number>();
    llmEvents.forEach(e => {
      const cost = modelCost.get(e.model) || 0;
      modelCost.set(e.model, cost + (e.cost || 0));
    });

    const costByModel = Array.from(modelCost.entries())
      .map(([model, cost]) => ({ model, cost }))
      .sort((a, b) => b.cost - a.cost);

    return {
      totalUsers: uniqueUsers,
      activeUsers: uniqueUsers, // Simplified - could be more sophisticated
      totalConversations,
      avgResponseTime,
      totalCost,
      topCategories,
      costByModel
    };
  }

  async getDailyCosts(days: number = 30): Promise<Array<{ date: string; cost: number }>> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      const query = `
        SELECT c.timestamp, c.cost
        FROM c
        WHERE c.type = 'llm_usage'
        AND c.timestamp >= @startDate
        AND c.timestamp <= @endDate
      `;

      const { resources } = await this.container.items.query({
        query,
        parameters: [
          { name: '@startDate', value: startDate.toISOString() },
          { name: '@endDate', value: endDate.toISOString() }
        ]
      }).fetchAll();

      // Group by date
      const dailyCosts = new Map<string, number>();
      resources.forEach(event => {
        const date = new Date(event.timestamp).toISOString().split('T')[0];
        const cost = dailyCosts.get(date) || 0;
        dailyCosts.set(date, cost + (event.cost || 0));
      });

      return Array.from(dailyCosts.entries())
        .map(([date, cost]) => ({ date, cost }))
        .sort((a, b) => a.date.localeCompare(b.date));

    } catch (error) {
      logger.error('Failed to get daily costs', { error, days });
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();