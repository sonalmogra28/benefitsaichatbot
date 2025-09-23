import { getRepositories } from '@/lib/azure/cosmos';
import { logger } from '../utils/logger-fix';
import { apiTrackingService } from './api-tracking.service';
import { benefitService } from './benefit-service';

export interface AnalyticsData {
  totalUsers: number;
  totalCompanies: number;
  totalConversations: number;
  totalDocuments: number;
  totalBenefitPlans: number;
  activeUsers: number;
  chatMessages: number;
  apiCalls: number;
  storageUsed: number;
  averageResponseTime: number;
  satisfactionRate: number;
  costPerMonth: number;
  systemMetrics?: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
    errorRate: number;
    uptime: number;
  };
}

export interface CompanyAnalytics {
  companyId: string;
  employeeCount: number;
  activeEmployees: number;
  documentsCount: number;
  conversationsCount: number;
  monthlyChats: number;
  enrollmentRate: number;
  averageCostPerEmployee: number;
  averageResponseTime: number;
  satisfactionRate: number;
}

export interface UserActivity {
  userId: string;
  userName: string;
  lastActive: Date;
  conversationCount: number;
  messageCount: number;
  documentsViewed: number;
  averageSessionDuration: number;
}

export interface ChatAnalytics {
  totalChats: number;
  averageMessagesPerChat: number;
  topQuestions: string[];
  peakHours: { hour: number; count: number }[];
  averageResponseTime: number;
  satisfactionRate: number;
  totalTokensUsed: number;
  costPerChat: number;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  errorRate: number;
  uptime: number;
}

class AnalyticsService {
  private async getActiveUsersCount(repositories: any, days: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const users = await repositories.users.query(
        'SELECT * FROM c WHERE c.lastActive >= @cutoffDate',
        [{ name: 'cutoffDate', value: cutoffDate.toISOString() }]
      );
      
      return users.resources.length;
    } catch (error) {
      logger.error('Error getting active users count', error);
      return 0;
    }
  }

  private async getTotalMessagesCount(repositories: any): Promise<number> {
    try {
      const messages = await repositories.messages.query(
        'SELECT COUNT(1) as count FROM c'
      );
      
      return messages.resources[0]?.count || 0;
    } catch (error) {
      logger.error('Error getting total messages count', error);
      return 0;
    }
  }

  private async getStorageUsed(repositories: any): Promise<number> {
    try {
      const documents = await repositories.documents.query(
        'SELECT c.size FROM c WHERE c.size IS NOT NULL'
      );
      
      return documents.resources.reduce((total: number, doc: any) => total + (doc.size || 0), 0);
    } catch (error) {
      logger.error('Error getting storage used', error);
      return 0;
    }
  }

  private async getAverageResponseTime(repositories: any): Promise<number> {
    try {
      const messages = await repositories.messages.query(
        'SELECT c.responseTime FROM c WHERE c.responseTime IS NOT NULL AND c.role = "assistant"'
      );
      
      if (messages.resources.length === 0) return 0;
      
      const totalTime = messages.resources.reduce((sum: number, msg: any) => sum + (msg.responseTime || 0), 0);
      return Math.round(totalTime / messages.resources.length);
    } catch (error) {
      logger.error('Error getting average response time', error);
      return 0;
    }
  }

  private async getSatisfactionRate(repositories: any): Promise<number> {
    try {
      const feedback = await repositories.feedback?.query(
        'SELECT c.rating FROM c WHERE c.rating IS NOT NULL'
      ) || { resources: [] };
      
      if (feedback.resources.length === 0) return 0;
      
      const totalRating = feedback.resources.reduce((sum: number, fb: any) => sum + (fb.rating || 0), 0);
      return Math.round((totalRating / feedback.resources.length) * 100) / 100;
    } catch (error) {
      logger.error('Error getting satisfaction rate', error);
      return 0;
    }
  }

  private async getSystemMetrics(): Promise<{
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
    errorRate: number;
    uptime: number;
  }> {
    try {
      // Get system metrics using Node.js built-in modules
      const os = await import('os');
      const process = await import('process');
      
      // CPU usage (simplified - in production, use a more sophisticated method)
      const cpuUsage = this.getCPUUsage();
      
      // Memory usage
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
      
      // Disk usage (simplified - in production, use a proper disk usage library)
      const diskUsage = await this.getDiskUsage();
      
      // Network latency (simplified - in production, measure actual network calls)
      const networkLatency = await this.getNetworkLatency();
      
      // Error rate from API tracking
      const errorRate = await apiTrackingService.getErrorRate();
      
      // Uptime
      const uptime = process.uptime();
      
      return {
        cpuUsage,
        memoryUsage,
        diskUsage,
        networkLatency,
        errorRate,
        uptime
      };
    } catch (error) {
      logger.error('Failed to get system metrics', error);
      return {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        networkLatency: 0,
        errorRate: 0,
        uptime: 0
      };
    }
  }

  private getCPUUsage(): number {
    // Simplified CPU usage calculation
    // In production, use a proper CPU monitoring library
    const cpus = require('os').cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    for (let i = 0; i < cpus.length; i++) {
      const cpu = cpus[i];
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);
    
    return Math.max(0, Math.min(100, usage));
  }

  private async getDiskUsage(): Promise<number> {
    try {
      // Simplified disk usage - in production, use a proper library like 'diskusage'
      const fs = await import('fs/promises');
      const stats = await fs.statfs('/');
      const total = stats.bavail + stats.bfree;
      const used = total - stats.bavail;
      return (used / total) * 100;
    } catch (error) {
      logger.warn('Failed to get disk usage', error);
      return 0;
    }
  }

  private async getNetworkLatency(): Promise<number> {
    try {
      // Simplified network latency - in production, measure actual network calls
      const start = Date.now();
      // This is a placeholder - in production, you'd ping a known endpoint
      await new Promise(resolve => setTimeout(resolve, 10));
      return Date.now() - start;
    } catch (error) {
      logger.warn('Failed to get network latency', error);
      return 0;
    }
  }

  async getPlatformAnalytics(): Promise<AnalyticsData> {
    try {
      const repositories = await getRepositories();
      
      // Get basic counts
      const [users, companies, conversations, documents, totalBenefitPlans] = await Promise.all([
        repositories.users.list(),
        repositories.companies.list(),
        repositories.chats.list(),
        repositories.documents.list(),
        benefitService.getTotalBenefitPlansCount()
      ]);

      const totalUsers = users.length;
      const totalCompanies = companies.length;
      const totalConversations = conversations.length;
      const totalDocuments = documents.length;

      // Get active users (last 30 days)
      const activeUsers = await this.getActiveUsersCount(repositories, 30);

      // Get total messages
      const chatMessages = await this.getTotalMessagesCount(repositories);

      // Get storage used
      const storageUsed = await this.getStorageUsed(repositories);

      // Get performance metrics
      const averageResponseTime = await this.getAverageResponseTime(repositories);
      const satisfactionRate = await this.getSatisfactionRate(repositories);
      
      // Get system monitoring metrics
      const systemMetrics = await this.getSystemMetrics();

      // Get API call metrics
      const apiCalls = await apiTrackingService.getAPICallCount();

      // Calculate monthly cost (placeholder)
      const costPerMonth = this.calculateMonthlyCost(totalUsers, chatMessages, storageUsed);

      logger.info('Platform analytics retrieved successfully', {
        totalUsers,
        totalCompanies,
        totalConversations,
        totalDocuments,
        totalBenefitPlans,
        activeUsers,
        chatMessages
      });

      return {
        totalUsers,
        totalCompanies,
        totalConversations,
        totalDocuments,
        totalBenefitPlans,
        activeUsers,
        chatMessages,
        apiCalls,
        storageUsed,
        averageResponseTime,
        satisfactionRate,
        costPerMonth,
        systemMetrics
      };
    } catch (error) {
      logger.error('Error fetching platform analytics', error);
      throw error;
    }
  }

  async getCompanyAnalytics(companyId: string): Promise<CompanyAnalytics> {
    try {
      const repositories = await getRepositories();

      // Get company users
      const companyUsers = await repositories.users.query(
        'SELECT * FROM c WHERE c.companyId = @companyId',
        [{ name: 'companyId', value: companyId }]
      );

      const employeeCount = companyUsers.resources.length;

      // Get active employees (last 30 days)
      const activeEmployees = await this.getActiveUsersCount(repositories, 30);

      // Get company documents
      const companyDocuments = await repositories.documents.query(
        'SELECT * FROM c WHERE c.companyId = @companyId',
        [{ name: 'companyId', value: companyId }]
      );

      const documentsCount = companyDocuments.resources.length;

      // Get company conversations
      const companyConversations = await repositories.chats.query(
        'SELECT * FROM c WHERE c.companyId = @companyId',
        [{ name: 'companyId', value: companyId }]
      );

      const conversationsCount = companyConversations.resources.length;

      // Calculate monthly chats
      const monthlyChats = await this.getMonthlyChats(repositories, companyId);

      // Calculate enrollment rate
      const enrollmentRate = employeeCount > 0 ? (activeEmployees / employeeCount) * 100 : 0;

      // Calculate average cost per employee
      const averageCostPerEmployee = this.calculateCostPerEmployee(employeeCount, monthlyChats);

      // Get performance metrics
      const averageResponseTime = await this.getAverageResponseTime(repositories);
      const satisfactionRate = await this.getSatisfactionRate(repositories);

      logger.info('Company analytics retrieved successfully', {
        companyId,
        employeeCount,
        activeEmployees,
        documentsCount,
        conversationsCount
      });

      return {
        companyId,
        employeeCount,
        activeEmployees,
        documentsCount,
        conversationsCount,
        monthlyChats,
        enrollmentRate,
        averageCostPerEmployee,
        averageResponseTime,
        satisfactionRate
      };
    } catch (error) {
      logger.error('Error fetching company analytics', error, { companyId });
      throw error;
    }
  }

  async getUserActivity(companyId?: string): Promise<UserActivity[]> {
    try {
      const repositories = await getRepositories();
      
      let usersQuery = 'SELECT * FROM c';
      let parameters: any[] = [];
      
      if (companyId) {
        usersQuery += ' WHERE c.companyId = @companyId';
        parameters.push({ name: 'companyId', value: companyId });
      }
      
      const users = await repositories.users.query(usersQuery, parameters);
      const activities: UserActivity[] = [];

      for (const user of users.resources) {
        // Get user conversations
        const userConversations = await repositories.chats.query(
          'SELECT * FROM c WHERE c.userId = @userId',
          [{ name: 'userId', value: user.id }]
        );

        // Get user messages
        const userMessages = await repositories.messages.query(
          'SELECT * FROM c WHERE c.userId = @userId',
          [{ name: 'userId', value: user.id }]
        );

        const messageCount = userMessages.resources.length;
        const conversationCount = userConversations.resources.length;

        // Calculate average session duration
        const averageSessionDuration = this.calculateAverageSessionDuration(userConversations.resources);

        activities.push({
          userId: user.id,
          userName: user.displayName || user.email || 'Unknown',
          lastActive: new Date(user.lastActive || user.createdAt),
          conversationCount,
          messageCount,
          documentsViewed: user.documentsViewed || 0,
          averageSessionDuration
        });
      }

      logger.info('User activity retrieved successfully', {
        companyId,
        userCount: activities.length
      });

      return activities;
    } catch (error) {
      logger.error('Error fetching user activity', error, { companyId });
      throw error;
    }
  }

  async getChatAnalytics(companyId?: string): Promise<ChatAnalytics> {
    try {
      const repositories = await getRepositories();
      
      let conversationsQuery = 'SELECT * FROM c';
      let parameters: any[] = [];
      
      if (companyId) {
        conversationsQuery += ' WHERE c.companyId = @companyId';
        parameters.push({ name: 'companyId', value: companyId });
      }
      
      const conversations = await repositories.chats.query(conversationsQuery, parameters);
      const totalChats = conversations.resources.length;

      // Get all messages for these conversations
      const conversationIds = conversations.resources.map((c: any) => c.id);
      let totalMessages = 0;
      let totalTokensUsed = 0;
      const topQuestions: string[] = [];
      const peakHours: { [key: number]: number } = {};

      for (const conversationId of conversationIds) {
        const messages = await repositories.messages.query(
          'SELECT * FROM c WHERE c.chatId = @chatId',
          [{ name: 'chatId', value: conversationId }]
        );

        totalMessages += messages.resources.length;

        // Process messages for analytics
        for (const message of messages.resources) {
          if (message.role === 'user') {
            // Extract questions (simple heuristic)
            if (message.content.includes('?')) {
              topQuestions.push(message.content.substring(0, 100));
            }
          }

          // Track peak hours
          const hour = new Date(message.createdAt).getHours();
          peakHours[hour] = (peakHours[hour] || 0) + 1;

          // Track tokens used
          totalTokensUsed += message.tokensUsed || 0;
        }
      }

      const averageMessagesPerChat = totalChats > 0 ? Math.round(totalMessages / totalChats) : 0;
      const averageResponseTime = await this.getAverageResponseTime(repositories);
      const satisfactionRate = await this.getSatisfactionRate(repositories);
      const costPerChat = this.calculateCostPerChat(totalTokensUsed, totalChats);

      // Sort and limit top questions
      const sortedQuestions = topQuestions
        .sort((a, b) => b.length - a.length)
        .slice(0, 10);

      // Convert peak hours to array
      const peakHoursArray = Object.entries(peakHours)
        .map(([hour, count]) => ({ hour: parseInt(hour), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      logger.info('Chat analytics retrieved successfully', {
        companyId,
        totalChats,
        totalMessages,
        averageMessagesPerChat
      });

      return {
        totalChats,
        averageMessagesPerChat,
        topQuestions: sortedQuestions,
        peakHours: peakHoursArray,
        averageResponseTime,
        satisfactionRate,
        totalTokensUsed,
        costPerChat
      };
    } catch (error) {
      logger.error('Error fetching chat analytics', error, { companyId });
      throw error;
    }
  }

  // Public method that calls the private implementation
  async getSystemMetricsPublic(): Promise<SystemMetrics> {
    return this.getSystemMetrics();
  }

  private async getMonthlyChats(repositories: any, companyId: string): Promise<number> {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const chats = await repositories.chats.query(
        'SELECT * FROM c WHERE c.companyId = @companyId AND c.createdAt >= @startOfMonth',
        [
          { name: 'companyId', value: companyId },
          { name: 'startOfMonth', value: startOfMonth.toISOString() }
        ]
      );

      return chats.resources.length;
    } catch (error) {
      logger.error('Error getting monthly chats', error, { companyId });
      return 0;
    }
  }

  private calculateMonthlyCost(users: number, messages: number, storage: number): number {
    // Basic cost calculation
    const baseCost = 50; // Base infrastructure cost
    const userCost = users * 2; // $2 per user
    const messageCost = messages * 0.01; // $0.01 per message
    const storageCost = (storage / (1024 * 1024 * 1024)) * 0.1; // $0.10 per GB

    return Math.round((baseCost + userCost + messageCost + storageCost) * 100) / 100;
  }

  private calculateCostPerEmployee(employees: number, monthlyChats: number): number {
    if (employees === 0) return 0;
    
    const totalCost = this.calculateMonthlyCost(employees, monthlyChats, 0);
    return Math.round((totalCost / employees) * 100) / 100;
  }

  private calculateCostPerChat(tokensUsed: number, totalChats: number): number {
    if (totalChats === 0) return 0;
    
    // Rough estimate: $0.002 per 1K tokens
    const costPerToken = 0.002 / 1000;
    const totalCost = tokensUsed * costPerToken;
    
    return Math.round((totalCost / totalChats) * 100) / 100;
  }

  private calculateAverageSessionDuration(conversations: any[]): number {
    if (conversations.length === 0) return 0;
    
    let totalDuration = 0;
    let validSessions = 0;
    
    for (const conversation of conversations) {
      if (conversation.createdAt && conversation.updatedAt) {
        const start = new Date(conversation.createdAt);
        const end = new Date(conversation.updatedAt);
        const duration = end.getTime() - start.getTime();
        
        if (duration > 0) {
          totalDuration += duration;
          validSessions++;
        }
      }
    }
    
    return validSessions > 0 ? Math.round(totalDuration / validSessions / 1000) : 0; // Return in seconds
  }
}

export const analyticsService = new AnalyticsService();
export { AnalyticsService };