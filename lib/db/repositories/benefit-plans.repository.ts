import { eq, and, sql, desc, asc, gte, lte, isNull, or } from 'drizzle-orm';
import { withTenantContext } from '../tenant-context';
import { 
  benefitPlans, 
  benefitEnrollments, 
  users,
  type BenefitPlan, 
  type NewBenefitPlan,
  type BenefitEnrollment 
} from '../schema-v2';

/**
 * Benefit Plans Repository
 * 
 * Handles all benefit plan-related database operations with proper tenant isolation.
 * This replaces the mock data in AI tools with real database queries.
 */

export class BenefitPlansRepository {
  /**
   * Get all active benefit plans for a company
   */
  async findByCompany(stackOrgId: string, companyId: string): Promise<BenefitPlan[]> {
    return withTenantContext(stackOrgId, async (db) => {
      return await db
        .select()
        .from(benefitPlans)
        .where(
          and(
            eq(benefitPlans.companyId, companyId),
            eq(benefitPlans.isActive, true)
          )
        )
        .orderBy(asc(benefitPlans.type), asc(benefitPlans.name));
    });
  }

  /**
   * Get benefit plans by type (for AI tool: comparePlans)
   */
  async findByType(
    stackOrgId: string, 
    companyId: string, 
    planType: string
  ): Promise<BenefitPlan[]> {
    return withTenantContext(stackOrgId, async (db) => {
      return await db
        .select()
        .from(benefitPlans)
        .where(
          and(
            eq(benefitPlans.companyId, companyId),
            eq(benefitPlans.type, planType),
            eq(benefitPlans.isActive, true),
            // Only current or future plans
            or(
              isNull(benefitPlans.endDate),
              gte(benefitPlans.endDate, new Date().toISOString().split('T')[0])
            )
          )
        )
        .orderBy(asc(benefitPlans.monthlyPremiumEmployee));
    });
  }

  /**
   * Get benefit plans with enrollment data for a user (for AI tool: showBenefitsDashboard)
   */
  async findUserBenefitsWithEnrollments(
    stackOrgId: string,
    userId: string
  ): Promise<Array<{
    plan: BenefitPlan;
    enrollment: BenefitEnrollment | null;
  }>> {
    return withTenantContext(stackOrgId, async (db) => {
      return await db
        .select({
          plan: benefitPlans,
          enrollment: benefitEnrollments,
        })
        .from(benefitPlans)
        .leftJoin(
          benefitEnrollments,
          and(
            eq(benefitEnrollments.benefitPlanId, benefitPlans.id),
            eq(benefitEnrollments.userId, userId),
            eq(benefitEnrollments.status, 'active')
          )
        )
        .where(
          and(
            eq(benefitPlans.isActive, true),
            // Only current plans
            lte(benefitPlans.effectiveDate, new Date().toISOString().split('T')[0]),
            or(
              isNull(benefitPlans.endDate),
              gte(benefitPlans.endDate, new Date().toISOString().split('T')[0])
            )
          )
        )
        .orderBy(asc(benefitPlans.type), asc(benefitPlans.name));
    });
  }

  /**
   * Calculate total benefit costs for a user (for AI tool: calculateBenefitsCost)
   */
  async calculateUserBenefitsCosts(
    stackOrgId: string,
    userId: string
  ): Promise<{
    totalMonthlyCost: number;
    totalEmployeeContribution: number;
    totalEmployerContribution: number;
    enrollments: Array<{
      plan: BenefitPlan;
      enrollment: BenefitEnrollment;
    }>;
  }> {
    return withTenantContext(stackOrgId, async (db) => {
      const enrollments = await db
        .select({
          plan: benefitPlans,
          enrollment: benefitEnrollments,
        })
        .from(benefitEnrollments)
        .innerJoin(benefitPlans, eq(benefitPlans.id, benefitEnrollments.benefitPlanId))
        .where(
          and(
            eq(benefitEnrollments.userId, userId),
            eq(benefitEnrollments.status, 'active'),
            // Only current enrollments
            lte(benefitEnrollments.effectiveDate, new Date().toISOString().split('T')[0]),
            or(
              isNull(benefitEnrollments.endDate),
              gte(benefitEnrollments.endDate, new Date().toISOString().split('T')[0])
            )
          )
        );

      const totals = enrollments.reduce(
        (acc, { enrollment }) => ({
          totalMonthlyCost: acc.totalMonthlyCost + Number(enrollment.monthlyCost),
          totalEmployeeContribution: acc.totalEmployeeContribution + Number(enrollment.employeeContribution),
          totalEmployerContribution: acc.totalEmployerContribution + Number(enrollment.employerContribution),
        }),
        {
          totalMonthlyCost: 0,
          totalEmployeeContribution: 0,
          totalEmployerContribution: 0,
        }
      );

      return {
        ...totals,
        enrollments,
      };
    });
  }

  /**
   * Create a new benefit plan
   */
  async create(
    stackOrgId: string,
    data: NewBenefitPlan
  ): Promise<BenefitPlan> {
    return withTenantContext(stackOrgId, async (db) => {
      const [plan] = await db
        .insert(benefitPlans)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      
      return plan;
    });
  }

  /**
   * Update a benefit plan
   */
  async update(
    stackOrgId: string,
    planId: string,
    data: Partial<NewBenefitPlan>
  ): Promise<BenefitPlan | null> {
    return withTenantContext(stackOrgId, async (db) => {
      const [plan] = await db
        .update(benefitPlans)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(benefitPlans.id, planId))
        .returning();
      
      return plan || null;
    });
  }

  /**
   * Get plan comparison data (enhanced version for AI tools)
   */
  async getComparisonData(
    stackOrgId: string,
    companyId: string,
    planType?: string,
    familySize?: number
  ): Promise<Array<{
    plan: BenefitPlan;
    adjustedPremium: number;
    enrollmentCount: number;
  }>> {
    return withTenantContext(stackOrgId, async (db) => {
      const query = db
        .select({
          plan: benefitPlans,
          enrollmentCount: sql<number>`count(${benefitEnrollments.id})::int`,
        })
        .from(benefitPlans)
        .leftJoin(
          benefitEnrollments,
          and(
            eq(benefitEnrollments.benefitPlanId, benefitPlans.id),
            eq(benefitEnrollments.status, 'active')
          )
        )
        .where(
          and(
            eq(benefitPlans.companyId, companyId),
            eq(benefitPlans.isActive, true),
            planType ? eq(benefitPlans.type, planType) : sql`true`
          )
        )
        .groupBy(benefitPlans.id)
        .orderBy(asc(benefitPlans.monthlyPremiumEmployee));

      const results = await query;

      return results.map(({ plan, enrollmentCount }) => ({
        plan,
        adjustedPremium: familySize && familySize > 1 
          ? Number(plan.monthlyPremiumFamily || plan.monthlyPremiumEmployee) 
          : Number(plan.monthlyPremiumEmployee || 0),
        enrollmentCount,
      }));
    });
  }

  /**
   * Get benefit plan statistics for analytics
   */
  async getCompanyBenefitStats(
    stackOrgId: string,
    companyId: string
  ): Promise<{
    totalPlans: number;
    totalEnrollments: number;
    plansByType: Record<string, number>;
    averageCost: number;
  }> {
    return withTenantContext(stackOrgId, async (db) => {
      // Get total plans and enrollments
      const [totals] = await db
        .select({
          totalPlans: sql<number>`count(distinct ${benefitPlans.id})::int`,
          totalEnrollments: sql<number>`count(${benefitEnrollments.id})::int`,
          averageCost: sql<number>`avg(${benefitEnrollments.monthlyCost})::numeric`,
        })
        .from(benefitPlans)
        .leftJoin(
          benefitEnrollments,
          and(
            eq(benefitEnrollments.benefitPlanId, benefitPlans.id),
            eq(benefitEnrollments.status, 'active')
          )
        )
        .where(
          and(
            eq(benefitPlans.companyId, companyId),
            eq(benefitPlans.isActive, true)
          )
        );

      // Get plans by type
      const plansByTypeResults = await db
        .select({
          type: benefitPlans.type,
          count: sql<number>`count(*)::int`,
        })
        .from(benefitPlans)
        .where(
          and(
            eq(benefitPlans.companyId, companyId),
            eq(benefitPlans.isActive, true)
          )
        )
        .groupBy(benefitPlans.type);

      const plansByType = plansByTypeResults.reduce(
        (acc, { type, count }) => ({ ...acc, [type]: count }),
        {} as Record<string, number>
      );

      return {
        totalPlans: totals.totalPlans,
        totalEnrollments: totals.totalEnrollments,
        plansByType,
        averageCost: Number(totals.averageCost || 0),
      };
    });
  }
}
