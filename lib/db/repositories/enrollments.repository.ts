import { db } from '@/lib/db';
import { 
  benefitEnrollments, 
  benefitPlans, 
  users,
  type BenefitEnrollment, 
  type NewBenefitEnrollment 
} from '@/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';
import { withAuthTenantContext } from '@/lib/db/tenant-context';
import type { NextRequest } from 'next/server';

export class EnrollmentsRepository {
  /**
   * Get all enrollments for the current user
   */
  static async getUserEnrollments(request: NextRequest) {
    return withAuthTenantContext(request, async (companyId, userId) => {
      const enrollments = await db
        .select({
          enrollment: benefitEnrollments,
          plan: benefitPlans
        })
        .from(benefitEnrollments)
        .innerJoin(benefitPlans, eq(benefitEnrollments.benefitPlanId, benefitPlans.id))
        .where(
          and(
            eq(benefitEnrollments.userId, userId),
            eq(benefitEnrollments.status, 'active')
          )
        )
        .orderBy(benefitPlans.type);
      
      return enrollments;
    });
  }

  /**
   * Get enrollment summary for a user (for dashboard)
   */
  static async getUserEnrollmentSummary(request: NextRequest) {
    return withAuthTenantContext(request, async (companyId, userId) => {
      const enrollments = await db
        .select({
          planType: benefitPlans.type,
          planName: benefitPlans.name,
          planCategory: benefitPlans.category,
          provider: benefitPlans.provider,
          coverageType: benefitEnrollments.coverageType,
          monthlyCost: benefitEnrollments.monthlyCost,
          employeeContribution: benefitEnrollments.employeeContribution,
          employerContribution: benefitEnrollments.employerContribution,
          effectiveDate: benefitEnrollments.effectiveDate,
          deductibleIndividual: benefitPlans.deductibleIndividual,
          deductibleFamily: benefitPlans.deductibleFamily,
          outOfPocketMaxIndividual: benefitPlans.outOfPocketMaxIndividual,
          outOfPocketMaxFamily: benefitPlans.outOfPocketMaxFamily
        })
        .from(benefitEnrollments)
        .innerJoin(benefitPlans, eq(benefitEnrollments.benefitPlanId, benefitPlans.id))
        .where(
          and(
            eq(benefitEnrollments.userId, userId),
            eq(benefitEnrollments.status, 'active')
          )
        );

      // Calculate totals
      const totalMonthlyPremium = enrollments.reduce(
        (sum, e) => sum + Number(e.employeeContribution || 0), 
        0
      );
      
      const totalAnnualCost = totalMonthlyPremium * 12;

      // Group by plan type
      const byType = enrollments.reduce((acc, enrollment) => {
        const type = enrollment.planType;
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(enrollment);
        return acc;
      }, {} as Record<string, typeof enrollments>);

      return {
        enrollments,
        byType,
        summary: {
          totalMonthlyPremium,
          totalAnnualCost,
          planCount: enrollments.length
        }
      };
    });
  }

  /**
   * Get enrollment history for a user
   */
  static async getUserEnrollmentHistory(request: NextRequest) {
    return withAuthTenantContext(request, async (companyId, userId) => {
      const history = await db
        .select({
          enrollment: benefitEnrollments,
          plan: benefitPlans
        })
        .from(benefitEnrollments)
        .innerJoin(benefitPlans, eq(benefitEnrollments.benefitPlanId, benefitPlans.id))
        .where(eq(benefitEnrollments.userId, userId))
        .orderBy(desc(benefitEnrollments.effectiveDate));
      
      return history;
    });
  }

  /**
   * Get all enrollments for a specific benefit plan (admin)
   */
  static async getPlanEnrollments(request: NextRequest, planId: string) {
    return withAuthTenantContext(request, async (companyId) => {
      const enrollments = await db
        .select({
          enrollment: benefitEnrollments,
          user: users
        })
        .from(benefitEnrollments)
        .innerJoin(users, eq(benefitEnrollments.userId, users.id))
        .where(
          and(
            eq(benefitEnrollments.benefitPlanId, planId),
            eq(benefitEnrollments.status, 'active'),
            eq(users.companyId, companyId)
          )
        )
        .orderBy(users.lastName, users.firstName);
      
      return enrollments;
    });
  }

  /**
   * Create a new enrollment
   */
  static async create(request: NextRequest, data: Omit<NewBenefitEnrollment, 'id'>) {
    return withAuthTenantContext(request, async (companyId, userId) => {
      // Verify the user has access to this enrollment
      if (data.userId !== userId) {
        // Check if user is admin
        const user = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);
        
        if (!user[0] || !['hr_admin', 'company_admin'].includes(user[0].role)) {
          throw new Error('Unauthorized to create enrollment for another user');
        }
      }

      // Verify the plan belongs to the user's company
      const [plan] = await db
        .select()
        .from(benefitPlans)
        .where(
          and(
            eq(benefitPlans.id, data.benefitPlanId),
            eq(benefitPlans.companyId, companyId)
          )
        )
        .limit(1);
      
      if (!plan) {
        throw new Error('Invalid benefit plan');
      }

      const [enrollment] = await db
        .insert(benefitEnrollments)
        .values(data)
        .returning();
      
      return enrollment;
    });
  }

  /**
   * Update an enrollment
   */
  static async update(
    request: NextRequest, 
    enrollmentId: string, 
    data: Partial<NewBenefitEnrollment>
  ) {
    return withAuthTenantContext(request, async (companyId, userId) => {
      // Remove fields that shouldn't be updated
      const { id: _, userId: __, benefitPlanId: ___, ...updateData } = data;

      const [enrollment] = await db
        .update(benefitEnrollments)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(benefitEnrollments.id, enrollmentId))
        .returning();
      
      return enrollment || null;
    });
  }

  /**
   * Cancel an enrollment
   */
  static async cancel(request: NextRequest, enrollmentId: string, endDate: string) {
    return withAuthTenantContext(request, async (companyId, userId) => {
      const [enrollment] = await db
        .update(benefitEnrollments)
        .set({
          status: 'cancelled',
          endDate,
          updatedAt: new Date()
        })
        .where(eq(benefitEnrollments.id, enrollmentId))
        .returning();
      
      return enrollment || null;
    });
  }

  /**
   * Get upcoming enrollment deadlines
   */
  static async getUpcomingDeadlines(request: NextRequest) {
    return withAuthTenantContext(request, async (companyId) => {
      // This would typically come from a separate enrollment_periods table
      // For now, return mock data
      return [
        {
          type: 'Open Enrollment',
          startDate: '2024-11-01',
          endDate: '2024-11-30',
          description: 'Annual open enrollment period'
        },
        {
          type: 'FSA Enrollment',
          startDate: '2024-11-01',
          endDate: '2024-11-15',
          description: 'Flexible Spending Account enrollment deadline'
        }
      ];
    });
  }

  /**
   * Calculate potential savings for different plans
   */
  static async calculatePlanSavings(request: NextRequest, userId: string) {
    return withAuthTenantContext(request, async (companyId) => {
      // Get user's current enrollments
      const currentEnrollments = await db
        .select({
          planType: benefitPlans.type,
          currentCost: benefitEnrollments.employeeContribution
        })
        .from(benefitEnrollments)
        .innerJoin(benefitPlans, eq(benefitEnrollments.benefitPlanId, benefitPlans.id))
        .where(
          and(
            eq(benefitEnrollments.userId, userId),
            eq(benefitEnrollments.status, 'active'),
            eq(benefitPlans.type, 'health')
          )
        );

      if (currentEnrollments.length === 0) {
        return null;
      }

      const currentHealthCost = Number(currentEnrollments[0].currentCost || 0);

      // Get all available health plans
      const availablePlans = await db
        .select()
        .from(benefitPlans)
        .where(
          and(
            eq(benefitPlans.companyId, companyId),
            eq(benefitPlans.type, 'health'),
            eq(benefitPlans.isActive, true)
          )
        );

      // Calculate potential savings
      const savings = availablePlans.map(plan => {
        const planCost = Number(plan.monthlyPremiumEmployee || 0);
        const monthlySavings = currentHealthCost - planCost;
        const annualSavings = monthlySavings * 12;

        return {
          planId: plan.id,
          planName: plan.name,
          planCategory: plan.category,
          currentMonthlyCost: currentHealthCost,
          newMonthlyCost: planCost,
          monthlySavings,
          annualSavings,
          percentSavings: currentHealthCost > 0 
            ? Math.round((monthlySavings / currentHealthCost) * 100)
            : 0
        };
      }).filter(s => s.monthlySavings > 0)
        .sort((a, b) => b.annualSavings - a.annualSavings);

      return savings;
    });
  }
}

// Export a singleton instance for direct use
export const enrollmentsRepository = EnrollmentsRepository;