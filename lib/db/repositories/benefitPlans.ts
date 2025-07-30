import { db } from '@/lib/db';
import { benefitPlans, benefitEnrollments, type BenefitPlan, type NewBenefitPlan } from '@/lib/db/schema-v2';
import { eq, and, sql, gte } from 'drizzle-orm';
import { getCurrentTenantContext, withAuthTenantContext } from '@/lib/db/tenant-context';
import type { NextRequest } from 'next/server';

export class BenefitPlansRepository {
  /**
   * Get all active benefit plans for the current tenant
   */
  static async getAllActive(request: NextRequest) {
    return withAuthTenantContext(request, async (companyId) => {
      const plans = await db
        .select()
        .from(benefitPlans)
        .where(
          and(
            eq(benefitPlans.companyId, companyId),
            eq(benefitPlans.isActive, true)
          )
        )
        .orderBy(benefitPlans.type, benefitPlans.name);
      
      return plans;
    });
  }

  /**
   * Get benefit plans by type for the current tenant
   */
  static async getByType(request: NextRequest, type: string) {
    return withAuthTenantContext(request, async (companyId) => {
      const plans = await db
        .select()
        .from(benefitPlans)
        .where(
          and(
            eq(benefitPlans.companyId, companyId),
            eq(benefitPlans.type, type),
            eq(benefitPlans.isActive, true)
          )
        )
        .orderBy(benefitPlans.monthlyPremiumEmployee);
      
      return plans;
    });
  }

  /**
   * Get a specific benefit plan by ID
   */
  static async getById(request: NextRequest, planId: string) {
    return withAuthTenantContext(request, async (companyId) => {
      const [plan] = await db
        .select()
        .from(benefitPlans)
        .where(
          and(
            eq(benefitPlans.id, planId),
            eq(benefitPlans.companyId, companyId)
          )
        )
        .limit(1);
      
      return plan || null;
    });
  }

  /**
   * Get benefit plans with enrollment counts
   */
  static async getWithEnrollmentCounts(request: NextRequest) {
    return withAuthTenantContext(request, async (companyId) => {
      const plans = await db
        .select({
          plan: benefitPlans,
          enrollmentCount: sql<number>`count(${benefitEnrollments.id})::int`,
          totalMonthlyCost: sql<number>`coalesce(sum(${benefitEnrollments.monthlyCost}), 0)::numeric`
        })
        .from(benefitPlans)
        .leftJoin(
          benefitEnrollments,
          and(
            eq(benefitPlans.id, benefitEnrollments.benefitPlanId),
            eq(benefitEnrollments.status, 'active')
          )
        )
        .where(
          and(
            eq(benefitPlans.companyId, companyId),
            eq(benefitPlans.isActive, true)
          )
        )
        .groupBy(benefitPlans.id)
        .orderBy(benefitPlans.type, benefitPlans.name);
      
      return plans.map(({ plan, enrollmentCount, totalMonthlyCost }) => ({
        ...plan,
        enrollmentCount,
        totalMonthlyCost
      }));
    });
  }

  /**
   * Compare multiple benefit plans
   */
  static async comparePlans(request: NextRequest, planIds: string[]) {
    return withAuthTenantContext(request, async (companyId) => {
      const plans = await db
        .select()
        .from(benefitPlans)
        .where(
          and(
            eq(benefitPlans.companyId, companyId),
            sql`${benefitPlans.id} = ANY(${planIds})`
          )
        );
      
      return plans;
    });
  }

  /**
   * Get plans effective on a specific date
   */
  static async getEffectiveOnDate(request: NextRequest, date: Date) {
    return withAuthTenantContext(request, async (companyId) => {
      const dateStr = date.toISOString().split('T')[0];
      
      const plans = await db
        .select()
        .from(benefitPlans)
        .where(
          and(
            eq(benefitPlans.companyId, companyId),
            gte(benefitPlans.effectiveDate, dateStr),
            sql`${benefitPlans.endDate} IS NULL OR ${benefitPlans.endDate} > ${dateStr}`
          )
        )
        .orderBy(benefitPlans.type, benefitPlans.name);
      
      return plans;
    });
  }

  /**
   * Create a new benefit plan (admin only)
   */
  static async create(request: NextRequest, data: Omit<NewBenefitPlan, 'companyId'>) {
    return withAuthTenantContext(request, async (companyId) => {
      const [plan] = await db
        .insert(benefitPlans)
        .values({
          ...data,
          companyId
        })
        .returning();
      
      return plan;
    });
  }

  /**
   * Update a benefit plan (admin only)
   */
  static async update(request: NextRequest, planId: string, data: Partial<NewBenefitPlan>) {
    return withAuthTenantContext(request, async (companyId) => {
      // Remove fields that shouldn't be updated
      const { companyId: _, id: __, ...updateData } = data;
      
      const [plan] = await db
        .update(benefitPlans)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(benefitPlans.id, planId),
            eq(benefitPlans.companyId, companyId)
          )
        )
        .returning();
      
      return plan || null;
    });
  }

  /**
   * Deactivate a benefit plan (soft delete)
   */
  static async deactivate(request: NextRequest, planId: string) {
    return withAuthTenantContext(request, async (companyId) => {
      const [plan] = await db
        .update(benefitPlans)
        .set({
          isActive: false,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(benefitPlans.id, planId),
            eq(benefitPlans.companyId, companyId)
          )
        )
        .returning();
      
      return plan || null;
    });
  }

  /**
   * Get plans by category (HMO, PPO, HDHP, etc.)
   */
  static async getByCategory(request: NextRequest, category: string) {
    return withAuthTenantContext(request, async (companyId) => {
      const plans = await db
        .select()
        .from(benefitPlans)
        .where(
          and(
            eq(benefitPlans.companyId, companyId),
            eq(benefitPlans.category, category),
            eq(benefitPlans.isActive, true)
          )
        )
        .orderBy(benefitPlans.monthlyPremiumEmployee);
      
      return plans;
    });
  }

  /**
   * Calculate total cost for a plan based on coverage type
   */
  static calculateMonthlyCost(plan: BenefitPlan, coverageType: 'individual' | 'family' | 'employee_spouse') {
    switch (coverageType) {
      case 'individual':
        return Number(plan.monthlyPremiumEmployee || 0);
      case 'family':
        return Number(plan.monthlyPremiumFamily || 0);
      case 'employee_spouse':
        // Typically employee + spouse is between individual and family rates
        const individual = Number(plan.monthlyPremiumEmployee || 0);
        const family = Number(plan.monthlyPremiumFamily || 0);
        return individual + ((family - individual) * 0.6); // 60% of the difference
      default:
        return 0;
    }
  }
}

// Export a singleton instance for direct use
export const benefitPlansRepository = BenefitPlansRepository;