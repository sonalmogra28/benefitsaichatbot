import { eq, and, sql, desc, asc } from 'drizzle-orm';
import { withTenantContext } from '../tenant-context';
import { 
  users, 
  companies,
  benefitEnrollments,
  benefitPlans,
  type User, 
  type NewUser 
} from '../schema-v2';

/**
 * User Repository
 * 
 * Handles all user-related database operations with proper tenant isolation.
 * Provides user management functionality for multi-tenant environment.
 */

export class UserRepository {
  /**
   * Find user by Stack user ID
   */
  async findByStackUserId(stackUserId: string): Promise<(User & { company: any }) | null> {
    const db = await import('../tenant-context').then(m => m.getDatabase());
    
    const result = await db
      .select()
      .from(users)
      .leftJoin(companies, eq(users.companyId, companies.id))
      .where(eq(users.stackUserId, stackUserId))
      .limit(1);
    
    const [row] = result;
    if (!row) return null;
    
    return {
      ...row.users,
      company: row.companies
    };
  }

  /**
   * Get all users for a company
   */
  async findByCompany(
    stackOrgId: string, 
    companyId: string,
    options?: {
      includeInactive?: boolean;
      role?: string;
      department?: string;
    }
  ): Promise<User[]> {
    return withTenantContext(stackOrgId, async (db) => {
      let conditions = [eq(users.companyId, companyId)];
      
      if (!options?.includeInactive) {
        conditions.push(eq(users.isActive, true));
      }
      
      if (options?.role) {
        conditions.push(eq(users.role, options.role));
      }
      
      if (options?.department) {
        conditions.push(eq(users.department, options.department));
      }

      return await db
        .select()
        .from(users)
        .where(and(...conditions))
        .orderBy(asc(users.lastName), asc(users.firstName));
    });
  }

  /**
   * Create a new user
   */
  async create(
    stackOrgId: string,
    data: NewUser
  ): Promise<User> {
    return withTenantContext(stackOrgId, async (db) => {
      const [user] = await db
        .insert(users)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      
      return user;
    });
  }

  /**
   * Update user information
   */
  async update(
    stackOrgId: string,
    userId: string,
    data: Partial<NewUser>
  ): Promise<User | null> {
    return withTenantContext(stackOrgId, async (db) => {
      const [user] = await db
        .update(users)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();
      
      return user || null;
    });
  }

  /**
   * Get user with benefit enrollment summary
   */
  async findWithBenefitsSummary(
    stackOrgId: string,
    userId: string
  ): Promise<{
    user: User;
    benefitsSummary: {
      totalEnrollments: number;
      totalMonthlyCost: number;
      enrollmentsByType: Record<string, number>;
    };
  } | null> {
    return withTenantContext(stackOrgId, async (db) => {
      // Get user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) return null;

      // Get benefits summary
      const [summary] = await db
        .select({
          totalEnrollments: sql<number>`count(${benefitEnrollments.id})::int`,
          totalMonthlyCost: sql<number>`sum(${benefitEnrollments.monthlyCost})::numeric`,
        })
        .from(benefitEnrollments)
        .where(
          and(
            eq(benefitEnrollments.userId, userId),
            eq(benefitEnrollments.status, 'active')
          )
        );

      // Get enrollments by type
      const enrollmentsByTypeResults = await db
        .select({
          type: benefitPlans.type,
          count: sql<number>`count(*)::int`,
        })
        .from(benefitEnrollments)
        .innerJoin(benefitPlans, eq(benefitPlans.id, benefitEnrollments.benefitPlanId))
        .where(
          and(
            eq(benefitEnrollments.userId, userId),
            eq(benefitEnrollments.status, 'active')
          )
        )
        .groupBy(benefitPlans.type);

      const enrollmentsByType = enrollmentsByTypeResults.reduce(
        (acc, { type, count }) => ({ ...acc, [type]: count }),
        {} as Record<string, number>
      );

      return {
        user,
        benefitsSummary: {
          totalEnrollments: summary.totalEnrollments,
          totalMonthlyCost: Number(summary.totalMonthlyCost || 0),
          enrollmentsByType,
        },
      };
    });
  }

  /**
   * Get company user statistics
   */
  async getCompanyUserStats(
    stackOrgId: string,
    companyId: string
  ): Promise<{
    totalUsers: number;
    activeUsers: number;
    usersByRole: Record<string, number>;
    usersByDepartment: Record<string, number>;
    recentHires: User[];
  }> {
    return withTenantContext(stackOrgId, async (db) => {
      // Get total and active users
      const [totals] = await db
        .select({
          totalUsers: sql<number>`count(*)::int`,
          activeUsers: sql<number>`count(case when ${users.isActive} then 1 end)::int`,
        })
        .from(users)
        .where(eq(users.companyId, companyId));

      // Get users by role
      const usersByRoleResults = await db
        .select({
          role: users.role,
          count: sql<number>`count(*)::int`,
        })
        .from(users)
        .where(
          and(
            eq(users.companyId, companyId),
            eq(users.isActive, true)
          )
        )
        .groupBy(users.role);

      const usersByRole = usersByRoleResults.reduce(
        (acc, { role, count }) => ({ ...acc, [role]: count }),
        {} as Record<string, number>
      );

      // Get users by department
      const usersByDepartmentResults = await db
        .select({
          department: users.department,
          count: sql<number>`count(*)::int`,
        })
        .from(users)
        .where(
          and(
            eq(users.companyId, companyId),
            eq(users.isActive, true),
            sql`${users.department} IS NOT NULL`
          )
        )
        .groupBy(users.department);

      const usersByDepartment = usersByDepartmentResults.reduce(
        (acc, { department, count }) => ({ ...acc, [department || 'Unknown']: count }),
        {} as Record<string, number>
      );

      // Get recent hires (last 90 days)
      const recentHires = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.companyId, companyId),
            eq(users.isActive, true),
            sql`${users.hireDate} >= CURRENT_DATE - INTERVAL '90 days'`
          )
        )
        .orderBy(desc(users.hireDate))
        .limit(10);

      return {
        totalUsers: totals.totalUsers,
        activeUsers: totals.activeUsers,
        usersByRole,
        usersByDepartment,
        recentHires,
      };
    });
  }

  /**
   * Deactivate user (soft delete)
   */
  async deactivate(
    stackOrgId: string,
    userId: string
  ): Promise<boolean> {
    return withTenantContext(stackOrgId, async (db) => {
      const [user] = await db
        .update(users)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();
      
      return !!user;
    });
  }

  /**
   * Bulk create users (for CSV import)
   */
  async bulkCreate(
    stackOrgId: string,
    userData: NewUser[]
  ): Promise<User[]> {
    return withTenantContext(stackOrgId, async (db) => {
      const usersToInsert = userData.map(user => ({
        ...user,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      return await db
        .insert(users)
        .values(usersToInsert)
        .returning();
    });
  }
}
