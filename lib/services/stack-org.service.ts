import { getRepositories } from '@/lib/azure/cosmos';
import { logger } from '../utils/logger-fix';

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  slug?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export class StackOrgService {
  /**
   * Create a new organization
   */
  async createOrganization(data: {
    name: string;
    domain?: string;
    slug?: string;
    metadata?: Record<string, any>;
  }): Promise<Organization> {
    try {
      const repositories = await getRepositories();
      const orgId = `org_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const organization = {
        id: orgId,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await repositories.documents.create({
        ...organization,
        type: 'organization'
      });

      // Also create in companies collection for compatibility
      await repositories.companies.create({
        id: orgId,
        name: data.name,
        domain: data.domain,
        slug: data.slug,
        metadata: data.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      logger.info('Organization created successfully', {
        orgId,
        name: data.name
      });

      return organization;
    } catch (error) {
      logger.error('Failed to create organization:', error);
      throw error;
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganization(orgId: string): Promise<Organization | null> {
    try {
      const repositories = await getRepositories();
      
      // Try organizations collection first
      let doc = await repositories.documents.getById(orgId, 'organizations');

      if (!doc) {
        // Fall back to companies collection
        doc = await repositories.companies.getById(orgId, 'organizations');
      }

      if (!doc) {
        return null;
      }

      return doc as Organization;
    } catch (error) {
      logger.error('Failed to get organization:', error);
      return null;
    }
  }

  /**
   * Update organization
   */
  async updateOrganization(
    orgId: string,
    updateData: Partial<Organization>
  ): Promise<Organization | null> {
    try {
      const repositories = await getRepositories();
      
      const existingOrg = await this.getOrganization(orgId);
      if (!existingOrg) {
        return null;
      }

      const updatedOrg = {
        ...existingOrg,
        ...updateData,
        id: orgId, // Ensure ID doesn't change
        updatedAt: new Date().toISOString(),
      };

      // Update in both collections
      await repositories.documents.update(orgId, updatedOrg, 'organizations');
      await repositories.companies.update(orgId, {
        name: updatedOrg.name,
        domain: updatedOrg.domain,
        slug: updatedOrg.slug,
        metadata: updatedOrg.metadata,
        updatedAt: updatedOrg.updatedAt,
      }, 'organizations');

      logger.info('Organization updated successfully', {
        orgId,
        updateFields: Object.keys(updateData)
      });

      return updatedOrg;
    } catch (error) {
      logger.error('Failed to update organization:', error);
      throw error;
    }
  }

  /**
   * Delete organization
   */
  async deleteOrganization(orgId: string): Promise<void> {
    try {
      const repositories = await getRepositories();
      
      // Delete from both collections
      await repositories.documents.delete(orgId, 'organizations');
      await repositories.companies.delete(orgId, 'organizations');

      logger.info('Organization deleted successfully', { orgId });
    } catch (error) {
      logger.error('Failed to delete organization:', error);
      throw error;
    }
  }

  /**
   * List all organizations
   */
  async listOrganizations(limit: number = 50): Promise<Organization[]> {
    try {
      const repositories = await getRepositories();
      
      const query = `SELECT * FROM c WHERE c.type = 'organization' ORDER BY c.createdAt DESC`;
      const parameters: any[] = [];
      
      const { resources } = await repositories.documents.query(query, parameters);

      return resources.slice(0, limit);
    } catch (error) {
      logger.error('Failed to list organizations:', error);
      return [];
    }
  }

  /**
   * Get organization by domain
   */
  async getOrganizationByDomain(domain: string): Promise<Organization | null> {
    try {
      const repositories = await getRepositories();
      
      const query = `SELECT * FROM c WHERE c.domain = @domain AND c.type = 'organization'`;
      const parameters = [{ name: '@domain', value: domain }];
      
      const { resources } = await repositories.documents.query(query, parameters);

      return resources[0] || null;
    } catch (error) {
      logger.error('Failed to get organization by domain:', error);
      return null;
    }
  }

  /**
   * Get organization by slug
   */
  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    try {
      const repositories = await getRepositories();
      
      const query = `SELECT * FROM c WHERE c.slug = @slug AND c.type = 'organization'`;
      const parameters = [{ name: '@slug', value: slug }];
      
      const { resources } = await repositories.documents.query(query, parameters);

      return resources[0] || null;
    } catch (error) {
      logger.error('Failed to get organization by slug:', error);
      return null;
    }
  }
}

// Export singleton instance
export const stackOrgService = new StackOrgService();