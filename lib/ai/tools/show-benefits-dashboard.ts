import { tool } from 'ai';
import { z } from 'zod';
import { benefitService } from '@/lib/firebase/services/benefit.service';
// User context from AI system

export const showBenefitsDashboard = tool({
  description: "Show user's benefits dashboard with real enrollment data",
  inputSchema: z.object({}),
  execute: async ({ context }: any) => {
    try {
      // Get current user session and tenant context
      const user = context?.user || { companyId: 'default-company' };
      if (!user) {
        return {
          error: 'User not authenticated',
          user: null,
          enrollments: [],
          summary: {
            totalEnrollments: 0,
            totalMonthlyCost: 0,
            totalEmployeeContribution: 0,
            totalEmployerContribution: 0,
          },
          upcomingDeadlines: [],
        };
      }

      if (!user.companyId) {
        return {
          error: 'User not associated with a company',
          user: null,
          enrollments: [],
          summary: {
            totalEnrollments: 0,
            totalMonthlyCost: 0,
            totalEmployeeContribution: 0,
            totalEmployerContribution: 0,
          },
          upcomingDeadlines: [],
        };
      }

      // Get user's actual enrollments with tenant filtering
      const userEnrollments = await benefitService.getBenefitEnrollments(
        user.uid,
      );

      const plans = await benefitService.getBenefitPlans();
      const planMap = new Map(plans.map((p: any) => [p.id, p]));

      // Transform enrollments for dashboard display
      const enrollments = userEnrollments.map((enrollment) => {
        const plan: any = planMap.get(enrollment.benefitPlanId) || {};
        const monthlyPremium =
          plan.contributionAmounts?.employee ?? enrollment.monthlyCost;
        const employeeContribution = plan.contributionAmounts?.employee ?? 0;
        const employerContribution = plan.contributionAmounts?.employer ?? 0;
        const deductible = plan
          ? enrollment.coverageType === 'family'
            ? plan.deductibleFamily || 0
            : plan.deductibleIndividual || 0
          : 0;
        const outOfPocketMax = plan
          ? enrollment.coverageType === 'family'
            ? plan.outOfPocketMaxFamily || 0
            : plan.outOfPocketMaxIndividual || 0
          : 0;

        return {
          id: enrollment.id,
          planName: plan.name || 'Unknown Plan',
          type: plan.type || 'unknown',
          category: plan.category || 'N/A',
          provider: plan.provider || 'N/A',
          monthlyPremium,
          employeeContribution,
          employerContribution,
          deductible,
          outOfPocketMax,
          coverageType: enrollment.coverageType,
          effectiveDate: enrollment.electedOn,
          endDate: null,
          status: enrollment.status,
        };
      });

      // Calculate summary
      const summary = {
        totalEnrollments: enrollments.length,
        totalMonthlyCost: enrollments.reduce(
          (sum, e) => sum + e.monthlyPremium,
          0,
        ),
        totalEmployeeContribution: enrollments.reduce(
          (sum, e) => sum + e.employeeContribution,
          0,
        ),
        totalEmployerContribution: enrollments.reduce(
          (sum, e) => sum + e.employerContribution,
          0,
        ),
      };

      // Calculate upcoming deadlines based on current date
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const upcomingDeadlines = [];

      // Open enrollment (typically November)
      const openEnrollmentDate = new Date(currentYear, 10, 1); // November 1
      if (openEnrollmentDate > currentDate) {
        upcomingDeadlines.push({
          event: 'Open Enrollment',
          date: openEnrollmentDate.toISOString().split('T')[0],
          description: 'Annual benefits enrollment period begins',
          daysUntil: Math.ceil(
            (openEnrollmentDate.getTime() - currentDate.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        });
      }

      // FSA deadline (end of year)
      const fsaDeadline = new Date(currentYear, 11, 31); // December 31
      if (fsaDeadline > currentDate) {
        upcomingDeadlines.push({
          event: 'FSA Deadline',
          date: fsaDeadline.toISOString().split('T')[0],
          description: 'Use remaining FSA funds before year-end',
          daysUntil: Math.ceil(
            (fsaDeadline.getTime() - currentDate.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        });
      }

      // Sort by date
      upcomingDeadlines.sort((a, b) => a.daysUntil - b.daysUntil);

      return {
        user: {
          id: user.uid,
          name: user.displayName || 'User',
          email: user.email || 'No email',
        },
        enrollments,
        summary,
        upcomingDeadlines,
      };
    } catch (error) {
      console.error('Error in showBenefitsDashboard tool:', error);
      return {
        error:
          'Unable to retrieve benefits dashboard data. Please try again later.',
        user: null,
        enrollments: [],
        summary: {
          totalEnrollments: 0,
          totalMonthlyCost: 0,
          totalEmployeeContribution: 0,
          totalEmployerContribution: 0,
        },
        upcomingDeadlines: [],
      };
    }
  },
});
