import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/stack-auth';
import { db } from '@/lib/db';
import { users, benefitEnrollments, benefitPlans } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stackUserId, session.user.id));

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const enrollments = await db
      .select()
      .from(benefitEnrollments)
      .innerJoin(benefitPlans, eq(benefitEnrollments.benefitPlanId, benefitPlans.id))
      .where(eq(benefitEnrollments.userId, user.id));

    const healthPlanEnrollment = enrollments.find(e => e.benefit_plans.type === 'health');

    const summary = {
      healthPlan: healthPlanEnrollment ? {
        name: healthPlanEnrollment.benefit_plans.name,
        type: healthPlanEnrollment.benefit_plans.category,
        deductibleUsed: 500, // Mock data
        deductibleTotal: healthPlanEnrollment.benefit_plans.deductibleIndividual,
        outOfPocketUsed: 1200, // Mock data
        outOfPocketMax: healthPlanEnrollment.benefit_plans.outOfPocketMaxIndividual,
      } : undefined,
      coverageTypes: enrollments.map(e => ({
        type: e.benefit_plans.type,
        status: e.benefit_enrollments.status,
        monthlyPremium: e.benefit_enrollments.monthlyCost,
        coverageLevel: e.benefit_enrollments.coverageType,
      })),
      upcomingDeadlines: [
        {
          event: 'Open Enrollment',
          date: '2025-11-15',
          daysRemaining: 90, // Mock data
        }
      ],
      savingsOpportunity: {
        amount: 350,
        recommendation: 'Consider switching to the HDHP plan to save on premiums.'
      }
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching benefits summary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch benefits summary' },
      { status: 500 }
    );
  }
}
