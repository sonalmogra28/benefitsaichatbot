/**
 * Tenant Management Service
 * Handles multi-tenant operations and data isolation
 */

import { Tenant, User, Conversation, Message, Document, Analytics, TenantUsage } from '@/lib/db/tenant-schema';
import { getContainer } from '@/lib/azure/cosmos-db';
import { logger } from '@/lib/logging/logger';

export class TenantService {
  private tenantsContainer;
  private usersContainer;
  private conversationsContainer;
  private messagesContainer;
  private documentsContainer;
  private analyticsContainer;
  private usageContainer;

  constructor() {
    this.tenantsContainer = getContainer('tenants');
    this.usersContainer = getContainer('users');
    this.conversationsContainer = getContainer('conversations');
    this.messagesContainer = getContainer('messages');
    this.documentsContainer = getContainer('documents');
    this.analyticsContainer = getContainer('analytics');
    this.usageContainer = getContainer('usage');
  }

  // Tenant Management
  async createTenant(tenant: Omit<Tenant, 'createdAt' | 'updatedAt'>): Promise<Tenant> {
    const now = new Date().toISOString();
    const newTenant: Tenant = {
      ...tenant,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const result = await this.tenantsContainer.items.create(newTenant);
      logger.info('Tenant created', { tenantId: tenant.id, name: tenant.name });
      return result.resource;
    } catch (error) {
      logger.error('Failed to create tenant', { tenantId: tenant.id, error });
      throw error;
    }
  }

  async getTenant(tenantId: string): Promise<Tenant | null> {
    try {
      const result = await this.tenantsContainer.item(tenantId, tenantId).read();
      return result.resource;
    } catch (error) {
      if (error.code === 404) {
        return null;
      }
      logger.error('Failed to get tenant', { tenantId, error });
      throw error;
    }
  }

  async updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> {
    try {
      const existing = await this.getTenant(tenantId);
      if (!existing) {
        throw new Error('Tenant not found');
      }

      const updated: Tenant = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const result = await this.tenantsContainer.item(tenantId, tenantId).replace(updated);
      logger.info('Tenant updated', { tenantId, updates: Object.keys(updates) });
      return result.resource;
    } catch (error) {
      logger.error('Failed to update tenant', { tenantId, error });
      throw error;
    }
  }

  async deleteTenant(tenantId: string): Promise<void> {
    try {
      // Soft delete - mark as inactive
      await this.updateTenant(tenantId, { status: 'inactive' });
      
      // TODO: Implement data retention policies
      // For now, we'll keep the data but mark the tenant as inactive
      
      logger.info('Tenant deleted', { tenantId });
    } catch (error) {
      logger.error('Failed to delete tenant', { tenantId, error });
      throw error;
    }
  }

  // User Management
  async createUser(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
    const now = new Date().toISOString();
    const newUser: User = {
      ...user,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const result = await this.usersContainer.items.create(newUser);
      logger.info('User created', { userId: user.id, tenantId: user.tenantId });
      return result.resource;
    } catch (error) {
      logger.error('Failed to create user', { userId: user.id, error });
      throw error;
    }
  }

  async getUser(tenantId: string, userId: string): Promise<User | null> {
    try {
      const result = await this.usersContainer.item(userId, tenantId).read();
      return result.resource;
    } catch (error) {
      if (error.code === 404) {
        return null;
      }
      logger.error('Failed to get user', { userId, tenantId, error });
      throw error;
    }
  }

  async getUserByEmail(tenantId: string, email: string): Promise<User | null> {
    try {
      const query = {
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.email = @email',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@email', value: email },
        ],
      };

      const result = await this.usersContainer.items.query(query).fetchAll();
      return result.resources[0] || null;
    } catch (error) {
      logger.error('Failed to get user by email', { email, tenantId, error });
      throw error;
    }
  }

  async updateUser(tenantId: string, userId: string, updates: Partial<User>): Promise<User> {
    try {
      const existing = await this.getUser(tenantId, userId);
      if (!existing) {
        throw new Error('User not found');
      }

      const updated: User = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      const result = await this.usersContainer.item(userId, tenantId).replace(updated);
      logger.info('User updated', { userId, tenantId, updates: Object.keys(updates) });
      return result.resource;
    } catch (error) {
      logger.error('Failed to update user', { userId, tenantId, error });
      throw error;
    }
  }

  // Data Isolation Helpers
  async getTenantConversations(tenantId: string, userId?: string, limit = 50): Promise<Conversation[]> {
    try {
      let query;
      if (userId) {
        query = {
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.userId = @userId ORDER BY c.updatedAt DESC',
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@userId', value: userId },
          ],
        };
      } else {
        query = {
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.updatedAt DESC',
          parameters: [{ name: '@tenantId', value: tenantId }],
        };
      }

      const result = await this.conversationsContainer.items.query(query).fetchAll();
      return result.resources.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get tenant conversations', { tenantId, userId, error });
      throw error;
    }
  }

  async getTenantMessages(tenantId: string, conversationId: string, limit = 100): Promise<Message[]> {
    try {
      const query = {
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.conversationId = @conversationId ORDER BY c.createdAt ASC',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@conversationId', value: conversationId },
        ],
      };

      const result = await this.messagesContainer.items.query(query).fetchAll();
      return result.resources.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get tenant messages', { tenantId, conversationId, error });
      throw error;
    }
  }

  async getTenantDocuments(tenantId: string, uploadedBy?: string, limit = 50): Promise<Document[]> {
    try {
      let query;
      if (uploadedBy) {
        query = {
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.uploadedBy = @uploadedBy ORDER BY c.createdAt DESC',
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@uploadedBy', value: uploadedBy },
          ],
        };
      } else {
        query = {
          query: 'SELECT * FROM c WHERE c.tenantId = @tenantId ORDER BY c.createdAt DESC',
          parameters: [{ name: '@tenantId', value: tenantId }],
        };
      }

      const result = await this.documentsContainer.items.query(query).fetchAll();
      return result.resources.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get tenant documents', { tenantId, uploadedBy, error });
      throw error;
    }
  }

  // Analytics and Usage
  async trackEvent(tenantId: string, event: Omit<Analytics, 'id' | 'tenantId' | 'timestamp'>): Promise<void> {
    try {
      const analyticsEvent: Analytics = {
        ...event,
        id: `analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        timestamp: new Date().toISOString(),
      };

      await this.analyticsContainer.items.create(analyticsEvent);
    } catch (error) {
      logger.error('Failed to track event', { tenantId, eventType: event.eventType, error });
      // Don't throw - analytics failures shouldn't break the main flow
    }
  }

  async getTenantUsage(tenantId: string, period: string): Promise<TenantUsage | null> {
    try {
      const query = {
        query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.period = @period',
        parameters: [
          { name: '@tenantId', value: tenantId },
          { name: '@period', value: period },
        ],
      };

      const result = await this.usageContainer.items.query(query).fetchAll();
      return result.resources[0] || null;
    } catch (error) {
      logger.error('Failed to get tenant usage', { tenantId, period, error });
      throw error;
    }
  }

  async updateTenantUsage(tenantId: string, period: string, usage: Partial<TenantUsage>): Promise<TenantUsage> {
    try {
      const existing = await this.getTenantUsage(tenantId, period);
      const now = new Date().toISOString();

      if (existing) {
        const updated: TenantUsage = {
          ...existing,
          ...usage,
          updatedAt: now,
        };
        const result = await this.usageContainer.item(existing.id, tenantId).replace(updated);
        return result.resource;
      } else {
        const newUsage: TenantUsage = {
          tenantId,
          period,
          totalMessages: 0,
          totalUsers: 0,
          totalDocuments: 0,
          totalApiCalls: 0,
          totalTokens: 0,
          totalCost: 0,
          createdAt: now,
          updatedAt: now,
          ...usage,
        };
        const result = await this.usageContainer.items.create(newUsage);
        return result.resource;
      }
    } catch (error) {
      logger.error('Failed to update tenant usage', { tenantId, period, error });
      throw error;
    }
  }

  // Validation
  async validateTenantAccess(tenantId: string, userId: string): Promise<boolean> {
    try {
      const user = await this.getUser(tenantId, userId);
      return user !== null && user.status === 'active';
    } catch (error) {
      logger.error('Failed to validate tenant access', { tenantId, userId, error });
      return false;
    }
  }

  async validateTenantStatus(tenantId: string): Promise<boolean> {
    try {
      const tenant = await this.getTenant(tenantId);
      return tenant !== null && tenant.status === 'active';
    } catch (error) {
      logger.error('Failed to validate tenant status', { tenantId, error });
      return false;
    }
  }
}

// Singleton instance
export const tenantService = new TenantService();
