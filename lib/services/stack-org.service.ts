
import { db } from '@/lib/db';
import { companies, users } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

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
  ): Promise<any> {
    try {
      // Note: Creating organizations programmatically may not be supported
      // This would typically be done through the Stack Auth dashboard
      
      // For now, return a mock response
      const mockOrgId = `org_${companyId}`;
      
      // Update company with Stack org ID
      await db
        .update(companies)
        .set({
          stackOrgId: mockOrgId,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, companyId));

      return { id: mockOrgId, displayName: data.name };

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
        .where(eq(companies.stackOrgId, ''));


      for (const company of companiesWithoutOrg) {
        try {
          await this.createOrganization(company.id, {
            name: company.name,
            domain: company.domain || undefined,
            metadata: {
              subscriptionTier: company.subscriptionTier,
              settings: company.settings,
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
   * Add user to organization (update in database)
   */
  async addUserToOrganization(
    userId: string,
    companyId: string
  ): Promise<void> {
    try {
      // Update user's company assignment
      await db
        .update(users)
        .set({
          companyId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));


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
      // Remove user's company assignment
      await db.execute(sql`
        UPDATE users 
        SET 
          company_id = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${userId}
      `);


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
      // Update company details
      await db
        .update(companies)
        .set({
          name: updates.name || undefined,
          domain: updates.domain,
          updatedAt: new Date(),
        })
        .where(eq(companies.id, companyId));


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
      // Get users from database
      const companyUsers = await db
        .select()
        .from(users)
        .where(eq(users.companyId, companyId));
      
      return companyUsers;

    } catch (error) {
      console.error('Failed to list organization users:', error);
      throw error;
    }
  }

  /**
   * Check if company has Stack organization
   */
  async hasStackOrganization(companyId: string): Promise<boolean> {
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    return company.length > 0 && !!company[0].stackOrgId && company[0].stackOrgId !== '';
  }
}

// Export singleton instance
export const stackOrgService = new StackOrgService();