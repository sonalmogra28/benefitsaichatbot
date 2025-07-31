import { tool } from 'ai';
import { z } from 'zod';
import { auth } from '@/app/(auth)/stack-auth';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { benefitPlans, benefitEnrollments, users } from '@/lib/db/schema';
import { getCurrentTenantContext } from '@/lib/db/tenant-context';

export const showBenefitsDashboard = tool({
  description: "Show user's benefits dashboard with real enrollment data",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      // Get current user session and tenant context
      const session = await auth();
      if (!session?.user?.id) {
        return {
          error: 'User not authenticated',
          user: null,
          enrollments: [],
          summary: {
            totalEnrollments: 0,
            totalMonthlyCost: 0,
            totalEmployeeContribution: 0,
            totalEmployerContribution: 0
          },
          upcomingDeadlines: []
        };
      }

      const tenantContext = await getCurrentTenantContext();
      if (!tenantContext.companyId) {
        return {
          error: 'User not associated with a company',
          user: null,
          enrollments: [],
          summary: {
            totalEnrollments: 0,
            totalMonthlyCost: 0,
            totalEmployeeContribution: 0,
            totalEmployerContribution: 0
          },
          upcomingDeadlines: []
        };
      }
      
      // Get user's actual enrollments with tenant filtering
      const userEnrollments = await db
        .select({
          enrollment: benefitEnrollments,
          plan: benefitPlans
        })
        .from(benefitEnrollments)
        .innerJoin(benefitPlans, eq(benefitEnrollments.benefitPlanId, benefitPlans.id))
        .innerJoin(users, eq(benefitEnrollments.userId, users.id))
        .where(
          and(
            eq(users.stackUserId, session.user.stackUserId),
            eq(users.companyId, tenantContext.companyId),
            eq(benefitEnrollments.status, 'active'),
            eq(benefitPlans.companyId, tenantContext.companyId)
          )
        );

      // Transform enrollments for dashboard display
      const enrollments = userEnrollments.map(({ enrollment, plan }) => ({
        id: enrollment.id,
        planName: plan?.name || 'Unknown Plan',
        type: plan?.type || 'unknown',
        category: plan?.category || 'N/A',
        provider: plan?.provider || 'N/A',
        monthlyPremium: Number(enrollment.monthlyCost),
        employeeContribution: Number(enrollment.employeeContribution),
        employerContribution: Number(enrollment.employerContribution),
        deductible: plan ? Number(plan.deductibleIndividual || 0) : 0,
        outOfPocketMax: plan ? Number(plan.outOfPocketMaxIndividual || 0) : 0,
        coverageType: enrollment.coverageType,
        effectiveDate: enrollment.effectiveDate,
        endDate: enrollment.endDate,
        status: enrollment.status
      }));

      // Calculate summary
      const summary = {
        totalEnrollments: enrollments.length,
        totalMonthlyCost: enrollments.reduce((sum, e) => sum + e.monthlyPremium, 0),
        totalEmployeeContribution: enrollments.reduce((sum, e) => sum + e.employeeContribution, 0),
        totalEmployerContribution: enrollments.reduce((sum, e) => sum + e.employerContribution, 0)
      };

      // Calculate upcoming deadlines based on current date
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const upcomingDeadlines = [];

      // Open enrollment (typically November)
      const openEnrollmentDate = new Date(currentYear, 10, 1); // November 1
      if (openEnrollmentDate > currentDate) {
        upcomingDeadlines.push({
          event: "Open Enrollment",
          date: openEnrollmentDate.toISOString().split('T')[0],
          description: "Annual benefits enrollment period begins",
          daysUntil: Math.ceil((openEnrollmentDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
        });
      }

      // FSA deadline (end of year)
      const fsaDeadline = new Date(currentYear, 11, 31); // December 31
      if (fsaDeadline > currentDate) {
        upcomingDeadlines.push({
          event: "FSA Deadline",
          date: fsaDeadline.toISOString().split('T')[0],
          description: "Use remaining FSA funds before year-end",
          daysUntil: Math.ceil((fsaDeadline.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
        });
      }

      // Sort by date
      upcomingDeadlines.sort((a, b) => a.daysUntil - b.daysUntil);

      return {
        user: {
          id: session.user.id,
          name: session.user.name || 'User',
          email: session.user.email || 'No email'
        },
        enrollments,
        summary,
        upcomingDeadlines
      };

    } catch (error) {
      console.error('Error in showBenefitsDashboard tool:', error);
      return {
        error: 'Unable to retrieve benefits dashboard data. Please try again later.',
        user: null,
        enrollments: [],
        summary: {
          totalEnrollments: 0,
          totalMonthlyCost: 0,
          totalEmployeeContribution: 0,
          totalEmployerContribution: 0
        },
        upcomingDeadlines: []
      };
    }
  }
});