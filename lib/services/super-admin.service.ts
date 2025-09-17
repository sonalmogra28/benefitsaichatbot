// lib/services/super-admin.service.ts
import {
  type SystemSettings,
  type PlatformStats,
  type AuditLog,
} from '@/lib/types/super-admin';

// Base URL for the new API route
const API_URL = '/api/super-admin/service';

class SuperAdminService {
  /**
   * Fetches platform-wide statistics from the dedicated API route
   */
  async getPlatformStats(): Promise<PlatformStats> {
    try {
      const response = await fetch(`${API_URL}?action=getPlatformStats`);
      if (!response.ok) {
        throw new Error('Failed to fetch platform stats');
      }
      return await response.json();
    } catch (error) {
      logger.error('Error fetching platform stats:', error);
      return {
        totalUsers: 0,
        totalDocuments: 0,
        totalBenefitPlans: 0,
        storageUsed: 0,
      };
    }
  }

  /**
   * Fetches recent activity logs from the dedicated API route
   */
  async getRecentActivity(limit = 10): Promise<AuditLog[]> {
    try {
      const response = await fetch(
        `${API_URL}?action=getRecentActivity&limit=${limit}`,
      );
      if (!response.ok) {
        throw new Error('Failed to fetch activity logs');
      }
      return await response.json();
    } catch (error) {
      logger.error('Error fetching activity logs:', error);
      return [];
    }
  }

  /**
   * Fetches system settings from the dedicated API route
   */
  async getSystemSettings(): Promise<SystemSettings> {
    try {
      const response = await fetch(`${API_URL}?action=getSystemSettings`);
      if (!response.ok) {
        throw new Error('Failed to fetch system settings');
      }
      return await response.json();
    } catch (error) {
      logger.error('Error fetching system settings:', error);
      // Return default settings on failure
      return this.getDefaultSettings();
    }
  }

  /**
   * Updates system settings via the dedicated API route
   */
  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<void> {
    try {
      const response = await fetch(`${API_URL}?action=updateSystemSettings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        throw new Error('Failed to update system settings');
      }
    } catch (error) {
      logger.error('Error updating system settings:', error);
      throw error;
    }
  }

  /**
   * Defines default system settings (remains on client for fallback)
   */
  private getDefaultSettings(): SystemSettings {
    return {
      maintenanceMode: false,
      signupsEnabled: true,
      defaultBillingPlan: 'free',
      maxCompaniesPerDomain: 1,
      emailSettings: {
        provider: 'ses',
        fromEmail: 'noreply@benefitschatbot.com',
        fromName: 'Benefits Chatbot',
      },
      storageSettings: {
        provider: 'gcs',
        maxFileSizeMB: 25,
        allowedFileTypes: ['pdf', 'md'],
      },
      aiSettings: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        maxTokensPerRequest: 1000,
        rateLimitPerMinute: 60,
      },
      featureFlags: {},
    };
  }
}

export const superAdminService = new SuperAdminService();
export { SuperAdminService };
