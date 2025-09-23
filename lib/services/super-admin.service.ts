// lib/services/super-admin.service.ts
import {
  type SystemSettings,
  type PlatformStats,
  type AuditLog,
  type DataExportRequest,
} from '@/lib/types/super-admin';
import { logger } from '../utils/logger-fix';
import { getRepositories } from '@/lib/azure/cosmos';

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
   * Updates a company's information
   */
  async updateCompany(companyId: string, updates: Partial<{
    name: string;
    domain: string;
    status: 'active' | 'inactive' | 'suspended';
    settings: any;
    metadata: any;
  }>): Promise<any> {
    try {
      const repositories = await getRepositories();
      const companiesRepository = repositories.companies;
      
      // Get existing company
      const existingCompany = await companiesRepository.getById(companyId);
      if (!existingCompany) {
        throw new Error('Company not found');
      }

      // Prepare update data
      const updateData = {
        ...existingCompany,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Update company in Cosmos DB
      const updatedCompany = await companiesRepository.update(companyId, updateData, companyId);
      
      logger.info('Company updated successfully', {
        companyId,
        updates: Object.keys(updates),
        updatedAt: updateData.updatedAt
      });

      return updatedCompany;
    } catch (error) {
      logger.error('Error updating company:', error);
      throw error;
    }
  }

  /**
   * Deletes a company and all associated data
   */
  async deleteCompany(companyId: string): Promise<void> {
    try {
      const repositories = await getRepositories();
      
      // Get company to verify it exists
      const company = await repositories.companies.getById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      // Delete all associated data
      const deletionPromises = [];

      // Delete all users in the company
      const users = await repositories.users.list();
      const companyUsers = users.filter(user => user.companyId === companyId);
      for (const user of companyUsers) {
        deletionPromises.push(repositories.users.delete(user.id, companyId));
      }

      // Delete all documents in the company
      const documents = await repositories.documents.list();
      const companyDocuments = documents.filter(doc => doc.companyId === companyId);
      for (const doc of companyDocuments) {
        deletionPromises.push(repositories.documents.delete(doc.id, companyId));
      }

      // Delete all chats in the company
      const chats = await repositories.chats.list();
      const companyChats = chats.filter(chat => chat.companyId === companyId);
      for (const chat of companyChats) {
        deletionPromises.push(repositories.chats.delete(chat.id, companyId));
      }

      // Delete all messages in the company
      const messages = await repositories.messages.list();
      const companyMessages = messages.filter(msg => msg.companyId === companyId);
      for (const msg of companyMessages) {
        deletionPromises.push(repositories.messages.delete(msg.id, companyId));
      }

      // Delete all benefit plans in the company
      const benefitPlans = await repositories.benefitPlans.list();
      const companyBenefitPlans = benefitPlans.filter(plan => plan.companyId === companyId);
      for (const plan of companyBenefitPlans) {
        deletionPromises.push(repositories.benefitPlans.delete(plan.id, companyId));
      }

      // Wait for all deletions to complete
      await Promise.all(deletionPromises);

      // Finally, delete the company itself
      await repositories.companies.delete(companyId, companyId);
      
      logger.info('Company and all associated data deleted successfully', {
        companyId,
        deletedUsers: companyUsers.length,
        deletedDocuments: companyDocuments.length,
        deletedChats: companyChats.length,
        deletedMessages: companyMessages.length,
        deletedBenefitPlans: companyBenefitPlans.length
      });
    } catch (error) {
      logger.error('Error deleting company:', error);
      throw error;
    }
  }

  /**
   * Gets a company by ID
   */
  async getCompany(companyId: string): Promise<any> {
    try {
      const response = await fetch(`${API_URL}?action=getCompany&companyId=${companyId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch company');
      }
      return await response.json();
    } catch (error) {
      logger.error('Error fetching company:', error);
      throw error;
    }
  }

  /**
   * Lists all companies with pagination
   */
  async listCompanies(page: number = 1, limit: number = 10): Promise<{
    companies: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const response = await fetch(
        `${API_URL}?action=listCompanies&page=${page}&limit=${limit}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch companies');
      }
      return await response.json();
    } catch (error) {
      logger.error('Error fetching companies:', error);
      throw error;
    }
  }

  /**
   * Export system data in various formats
   */
  async exportData(request: DataExportRequest): Promise<any> {
    try {
      const repositories = await getRepositories();
      const exportData: any = {};

      // Export companies if requested
      if (request.includeTypes.includes('companies')) {
        const companies = await repositories.companies.list();
        exportData.companies = companies.filter(company => 
          !request.companyId || company.id === request.companyId
        );
      }

      // Export users if requested
      if (request.includeTypes.includes('users')) {
        const users = await repositories.users.list();
        exportData.users = users.filter(user => 
          !request.companyId || user.companyId === request.companyId
        );
      }

      // Export documents if requested
      if (request.includeTypes.includes('documents')) {
        const documents = await repositories.documents.list();
        exportData.documents = documents.filter(doc => 
          !request.companyId || doc.companyId === request.companyId
        );
      }

      // Export chats if requested
      if (request.includeTypes.includes('chats')) {
        const chats = await repositories.chats.list();
        exportData.chats = chats.filter(chat => 
          !request.companyId || chat.companyId === request.companyId
        );
      }

      // Export messages if requested
      if (request.includeTypes.includes('messages')) {
        const messages = await repositories.messages.list();
        exportData.messages = messages.filter(msg => 
          !request.companyId || msg.companyId === request.companyId
        );
      }

      // Apply date filters if provided
      if (request.startDate || request.endDate) {
        Object.keys(exportData).forEach(key => {
          if (Array.isArray(exportData[key])) {
            exportData[key] = exportData[key].filter((item: any) => {
              const itemDate = new Date(item.createdAt || item.timestamp || item.updatedAt);
              if (request.startDate && itemDate < request.startDate) return false;
              if (request.endDate && itemDate > request.endDate) return false;
              return true;
            });
          }
        });
      }

      logger.info('Data export completed', {
        types: request.includeTypes,
        format: request.format,
        companyId: request.companyId,
        recordCounts: Object.keys(exportData).reduce((acc, key) => {
          acc[key] = Array.isArray(exportData[key]) ? exportData[key].length : 0;
          return acc;
        }, {} as Record<string, number>)
      });

      return exportData;
    } catch (error) {
      logger.error('Error exporting data:', error);
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
