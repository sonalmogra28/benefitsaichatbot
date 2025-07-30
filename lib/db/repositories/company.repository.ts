import { eq, and, sql } from 'drizzle-orm';
import { withTenantContext } from '../tenant-context';
import { db } from '@/lib/db';
import { companies, users, type Company, type NewCompany, type User } from '../schema-v2';

/**
 * Company Repository
 * 
 * Handles all company-related database operations with proper tenant isolation
 * and type safety. All operations are scoped to the current organization context.
 */

export class CompanyRepository {
  /**
   * Find company by Stack organization ID
   */
  async findByStackOrgId(stackOrgId: string): Promise<Company | null> {
    return withTenantContext(stackOrgId, async (db) => {
      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.stackOrgId, stackOrgId))
        .limit(1);
      
      return company || null;
    });
  }

  /**
   * Create a new company
   */
  async create(data: NewCompany): Promise<Company> {
    
    const [company] = await db
      .insert(companies)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return company;
  }

  /**
   * Update company settings
   */
  async updateSettings(
    stackOrgId: string, 
    settings: Record<string, any>
  ): Promise<Company | null> {
    return withTenantContext(stackOrgId, async (db) => {
      const [company] = await db
        .update(companies)
        .set({ 
          settings,
          updatedAt: new Date(),
        })
        .where(eq(companies.stackOrgId, stackOrgId))
        .returning();
      
      return company || null;
    });
  }

  /**
   * Get company with user count
   */
  async getWithStats(stackOrgId: string): Promise<{
    company: Company;
    userCount: number;
    activeUserCount: number;
  } | null> {
    return withTenantContext(stackOrgId, async (db) => {
      const [result] = await db
        .select({
          company: companies,
          userCount: sql<number>`count(${users.id})::int`,
          activeUserCount: sql<number>`count(case when ${users.isActive} then 1 end)::int`,
        })
        .from(companies)
        .leftJoin(users, eq(users.companyId, companies.id))
        .where(eq(companies.stackOrgId, stackOrgId))
        .groupBy(companies.id)
        .limit(1);
      
      return result || null;
    });
  }

  /**
   * Update subscription tier
   */
  async updateSubscriptionTier(
    stackOrgId: string,
    tier: string
  ): Promise<Company | null> {
    return withTenantContext(stackOrgId, async (db) => {
      const [company] = await db
        .update(companies)
        .set({ 
          subscriptionTier: tier,
          updatedAt: new Date(),
        })
        .where(eq(companies.stackOrgId, stackOrgId))
        .returning();
      
      return company || null;
    });
  }

  /**
   * Deactivate company (soft delete)
   */
  async deactivate(stackOrgId: string): Promise<boolean> {
    return withTenantContext(stackOrgId, async (db) => {
      const [company] = await db
        .update(companies)
        .set({ 
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(companies.stackOrgId, stackOrgId))
        .returning();
      
      return !!company;
    });
  }
}
