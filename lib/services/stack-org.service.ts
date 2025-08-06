import { stackServerApp } from '@/stack';
import { db } from '@/lib/db';
import { companies, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { Organization } from '@stackframe/stack';

export interface CreateOrganizationData {
  name: string;
  domain?: string;
  metadata?: Record<string, any>;
}

export class StackOrgService {
  /**
   * Create a new organization in Stack Auth and sync with our database
   */
  async createOrganization(
    companyId: string,
    data: CreateOrganizationData
  ): Promise<Organization> {
    try {
      // Create organization in Stack Auth
      const stackOrg = await stackServerApp.createOrganization({
        displayName: data.name,
        metadata: {
          companyId,
          domain: data.domain,
          ...data.metadata,
        },
      });

      // Update company with Stack org ID
      await db
        .update(companies)
        .set({
          stackOrgId: stackOrg.id,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, companyId));

      console.log(`Created Stack organization ${stackOrg.id} for company ${companyId}`);
      return stackOrg;

    } catch (error) {
      console.error('Failed to create Stack organization:', error);
      throw error;
    }
  }

  /**
   * Sync existing companies with Stack Auth organizations
   */
  async syncExistingCompanies(): Promise<void> {
    try {
      // Get companies without Stack org ID
      const companiesWithoutOrg = await db
        .select()
        .from(companies)
        .where(eq(companies.stackOrgId, null));

      console.log(`Found ${companiesWithoutOrg.length} companies without Stack organizations`);

      for (const company of companiesWithoutOrg) {
        try {
          await this.createOrganization(company.id, {
            name: company.name,
            domain: company.domain || undefined,
            metadata: {
              billingPlan: company.billingPlan,
              features: company.features,
            },
          });
        } catch (error) {
          console.error(`Failed to create org for company ${company.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to sync existing companies:', error);
      throw error;
    }
  }

  /**
   * Add user to organization
   */
  async addUserToOrganization(
    userId: string,
    companyId: string
  ): Promise<void> {
    try {
      // Get company's Stack org ID
      const company = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (!company || company.length === 0) {
        throw new Error(`Company ${companyId} not found`);
      }

      const stackOrgId = company[0].stackOrgId;
      if (!stackOrgId) {
        // Create organization if it doesn't exist
        const org = await this.createOrganization(companyId, {
          name: company[0].name,
          domain: company[0].domain || undefined,
        });
        stackOrgId = org.id;
      }

      // Get Stack user
      const stackUser = await stackServerApp.getUser({ userId });
      if (!stackUser) {
        throw new Error(`Stack user ${userId} not found`);
      }

      // Add user to organization
      await stackUser.addToOrganization(stackOrgId);

      // Update user metadata
      await stackUser.update({
        clientMetadata: {
          ...stackUser.clientMetadata,
          companyId,
        },
      });

      console.log(`Added user ${userId} to organization ${stackOrgId}`);

    } catch (error) {
      console.error('Failed to add user to organization:', error);
      throw error;
    }
  }

  /**
   * Remove user from organization
   */
  async removeUserFromOrganization(userId: string): Promise<void> {
    try {
      // Get Stack user
      const stackUser = await stackServerApp.getUser({ userId });
      if (!stackUser) {
        throw new Error(`Stack user ${userId} not found`);
      }

      // Get user's current organization
      const orgs = await stackUser.listOrganizations();
      
      // Remove from all organizations
      for (const org of orgs.items) {
        await stackUser.removeFromOrganization(org.id);
      }

      // Update user metadata
      await stackUser.update({
        clientMetadata: {
          ...stackUser.clientMetadata,
          companyId: undefined,
        },
      });

      console.log(`Removed user ${userId} from all organizations`);

    } catch (error) {
      console.error('Failed to remove user from organization:', error);
      throw error;
    }
  }

  /**
   * Update organization details
   */
  async updateOrganization(
    companyId: string,
    updates: Partial<CreateOrganizationData>
  ): Promise<void> {
    try {
      // Get company
      const company = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (!company || company.length === 0) {
        throw new Error(`Company ${companyId} not found`);
      }

      const stackOrgId = company[0].stackOrgId;
      if (!stackOrgId) {
        throw new Error(`Company ${companyId} has no Stack organization`);
      }

      // Get Stack organization
      const stackOrg = await stackServerApp.getOrganization(stackOrgId);
      if (!stackOrg) {
        throw new Error(`Stack organization ${stackOrgId} not found`);
      }

      // Update organization
      await stackOrg.update({
        displayName: updates.name || stackOrg.displayName,
        metadata: {
          ...stackOrg.metadata,
          ...updates.metadata,
        },
      });

      console.log(`Updated Stack organization ${stackOrgId}`);

    } catch (error) {
      console.error('Failed to update organization:', error);
      throw error;
    }
  }

  /**
   * List users in organization
   */
  async listOrganizationUsers(companyId: string): Promise<any[]> {
    try {
      // Get company
      const company = await db
        .select()
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (!company || company.length === 0) {
        throw new Error(`Company ${companyId} not found`);
      }

      const stackOrgId = company[0].stackOrgId;
      if (!stackOrgId) {
        return [];
      }

      // Get Stack organization
      const stackOrg = await stackServerApp.getOrganization(stackOrgId);
      if (!stackOrg) {
        throw new Error(`Stack organization ${stackOrgId} not found`);
      }

      // List organization users
      const orgUsers = await stackOrg.listUsers();
      
      return orgUsers.items;

    } catch (error) {
      console.error('Failed to list organization users:', error);
      throw error;
    }
  }

  /**
   * Sync organization users with local database
   */
  async syncOrganizationUsers(companyId: string): Promise<void> {
    try {
      const orgUsers = await this.listOrganizationUsers(companyId);
      
      console.log(`Syncing ${orgUsers.length} users for company ${companyId}`);

      // Update each user's company assignment
      for (const stackUser of orgUsers) {
        try {
          // Update user in database
          await db
            .update(users)
            .set({
              companyId,
              updatedAt: new Date(),
            })
            .where(eq(users.stackUserId, stackUser.id));

        } catch (error) {
          console.error(`Failed to sync user ${stackUser.id}:`, error);
        }
      }

    } catch (error) {
      console.error('Failed to sync organization users:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const stackOrgService = new StackOrgService();