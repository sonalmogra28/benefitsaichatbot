import { tool } from 'ai';
import { z } from 'zod';
import { auth } from '@/app/(auth)/stack-auth';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { benefitPlans, benefitEnrollments, users } from '../../db/schema-v2';

// Initialize database connection
function getDb() {
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Database connection string not found');
  }
  const client = postgres(connectionString);
  return drizzle(client);
}

export const showBenefitsDashboard = tool({
  description: "Show user's benefits dashboard with real enrollment data",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      // Get current user session
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

      const db = getDb();
      
      // For now, get sample data since multi-tenant isn't fully implemented
      // TODO: Add proper user filtering when multi-tenant is complete
      const sampleEnrollments = await db
        .select({
          enrollment: benefitEnrollments,
          plan: benefitPlans
        })
        .from(benefitEnrollments)
        .leftJoin(benefitPlans, eq(benefitEnrollments.benefitPlanId, benefitPlans.id))
        .where(eq(benefitEnrollments.status, 'active'))
        .limit(5);

      // Transform enrollments for dashboard display
      const enrollments = sampleEnrollments.map(({ enrollment, plan }) => ({
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

      // Calculate upcoming deadlines
      const upcomingDeadlines = [
        {
          event: "Open Enrollment",
          date: "2024-11-01",
          description: "Annual benefits enrollment period begins"
        },
        {
          event: "FSA Deadline",
          date: "2024-12-31",
          description: "Use remaining FSA funds before year-end"
        }
      ];

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