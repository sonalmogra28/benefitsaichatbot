import { getRepositories } from '@/lib/azure/cosmos';
import { logger } from '../utils/logger-fix';
import { v4 as uuidv4 } from 'uuid';

export interface APICall {
  id: string;
  endpoint: string;
  method: string;
  userId?: string;
  companyId?: string;
  statusCode: number;
  responseTime: number; // in milliseconds
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  requestSize?: number; // in bytes
  responseSize?: number; // in bytes
  errorMessage?: string;
}

export interface APICallMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageResponseTime: number;
  callsByEndpoint: Record<string, number>;
  callsByStatusCode: Record<number, number>;
  callsByHour: Record<number, number>;
  topUsers: Array<{ userId: string; callCount: number }>;
  topCompanies: Array<{ companyId: string; callCount: number }>;
}

export class APITrackingService {
  private apiCallsRepository: any;

  constructor() {
    this.initializeRepository();
  }

  private async initializeRepository() {
    const repositories = await getRepositories();
    this.apiCallsRepository = repositories.documents; // Using documents container for API calls
  }

  async trackAPICall(callData: Omit<APICall, 'id' | 'timestamp'>): Promise<void> {
    try {
      await this.initializeRepository();
      
      const apiCall: APICall = {
        id: `api_call_${uuidv4()}`,
        ...callData,
        timestamp: new Date()
      };

      await this.apiCallsRepository.create({
        ...apiCall,
        type: 'api_call',
        createdAt: apiCall.timestamp,
        updatedAt: apiCall.timestamp
      });

      logger.debug('API call tracked', {
        endpoint: callData.endpoint,
        method: callData.method,
        statusCode: callData.statusCode,
        responseTime: callData.responseTime
      });
    } catch (error) {
      logger.error('Failed to track API call', error, {
        endpoint: callData.endpoint,
        method: callData.method
      });
      // Don't throw error to avoid breaking the main API flow
    }
  }

  async getAPICallMetrics(
    companyId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<APICallMetrics> {
    try {
      await this.initializeRepository();
      
      let query = `SELECT * FROM c WHERE c.type = 'api_call'`;
      const parameters: any[] = [];

      if (companyId) {
        query += ` AND c.companyId = @companyId`;
        parameters.push({ name: '@companyId', value: companyId });
      }

      if (startDate) {
        query += ` AND c.timestamp >= @startDate`;
        parameters.push({ name: '@startDate', value: startDate.toISOString() });
      }

      if (endDate) {
        query += ` AND c.timestamp <= @endDate`;
        parameters.push({ name: '@endDate', value: endDate.toISOString() });
      }

      query += ` ORDER BY c.timestamp DESC`;

      const { resources: apiCalls } = await this.apiCallsRepository.query(query, parameters);

      return this.calculateMetrics(apiCalls);
    } catch (error) {
      logger.error('Failed to get API call metrics', error, {
        companyId,
        startDate,
        endDate
      });
      throw error;
    }
  }

  private calculateMetrics(apiCalls: APICall[]): APICallMetrics {
    const totalCalls = apiCalls.length;
    const successfulCalls = apiCalls.filter(call => call.statusCode >= 200 && call.statusCode < 300).length;
    const failedCalls = totalCalls - successfulCalls;
    
    const averageResponseTime = apiCalls.length > 0 
      ? apiCalls.reduce((sum, call) => sum + call.responseTime, 0) / apiCalls.length 
      : 0;

    // Group by endpoint
    const callsByEndpoint: Record<string, number> = {};
    apiCalls.forEach(call => {
      callsByEndpoint[call.endpoint] = (callsByEndpoint[call.endpoint] || 0) + 1;
    });

    // Group by status code
    const callsByStatusCode: Record<number, number> = {};
    apiCalls.forEach(call => {
      callsByStatusCode[call.statusCode] = (callsByStatusCode[call.statusCode] || 0) + 1;
    });

    // Group by hour
    const callsByHour: Record<number, number> = {};
    apiCalls.forEach(call => {
      const hour = new Date(call.timestamp).getHours();
      callsByHour[hour] = (callsByHour[hour] || 0) + 1;
    });

    // Top users
    const userCalls: Record<string, number> = {};
    apiCalls.forEach(call => {
      if (call.userId) {
        userCalls[call.userId] = (userCalls[call.userId] || 0) + 1;
      }
    });
    const topUsers = Object.entries(userCalls)
      .map(([userId, callCount]) => ({ userId, callCount }))
      .sort((a, b) => b.callCount - a.callCount)
      .slice(0, 10);

    // Top companies
    const companyCalls: Record<string, number> = {};
    apiCalls.forEach(call => {
      if (call.companyId) {
        companyCalls[call.companyId] = (companyCalls[call.companyId] || 0) + 1;
      }
    });
    const topCompanies = Object.entries(companyCalls)
      .map(([companyId, callCount]) => ({ companyId, callCount }))
      .sort((a, b) => b.callCount - a.callCount)
      .slice(0, 10);

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      averageResponseTime,
      callsByEndpoint,
      callsByStatusCode,
      callsByHour,
      topUsers,
      topCompanies
    };
  }

  async getAPICallCount(
    companyId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    try {
      const metrics = await this.getAPICallMetrics(companyId, startDate, endDate);
      return metrics.totalCalls;
    } catch (error) {
      logger.error('Failed to get API call count', error, {
        companyId,
        startDate,
        endDate
      });
      return 0;
    }
  }

  async getTopEndpoints(
    companyId?: string,
    limit: number = 10
  ): Promise<Array<{ endpoint: string; count: number }>> {
    try {
      const metrics = await this.getAPICallMetrics(companyId);
      return Object.entries(metrics.callsByEndpoint)
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      logger.error('Failed to get top endpoints', error, {
        companyId,
        limit
      });
      return [];
    }
  }

  async getErrorRate(
    companyId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    try {
      const metrics = await this.getAPICallMetrics(companyId, startDate, endDate);
      return metrics.totalCalls > 0 ? (metrics.failedCalls / metrics.totalCalls) * 100 : 0;
    } catch (error) {
      logger.error('Failed to get error rate', error, {
        companyId,
        startDate,
        endDate
      });
      return 0;
    }
  }

  async cleanupOldCalls(olderThanDays: number = 30): Promise<void> {
    try {
      await this.initializeRepository();
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const query = `SELECT * FROM c WHERE c.type = 'api_call' AND c.timestamp < @cutoffDate`;
      const parameters = [{ name: '@cutoffDate', value: cutoffDate.toISOString() }];
      
      const { resources: oldCalls } = await this.apiCallsRepository.query(query, parameters);
      
      for (const call of oldCalls) {
        await this.apiCallsRepository.delete(call.id);
      }
      
      logger.info('Cleaned up old API calls', {
        deletedCount: oldCalls.length,
        olderThanDays
      });
    } catch (error) {
      logger.error('Failed to cleanup old API calls', error, {
        olderThanDays
      });
      throw error;
    }
  }
}

// Export singleton instance
export const apiTrackingService = new APITrackingService();
