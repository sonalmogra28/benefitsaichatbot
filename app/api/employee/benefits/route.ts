import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/stack-auth';
import { db } from '@/lib/db';
import { benefitPlans, benefitEnrollments, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/employee/benefits - Get available benefit plans and current enrollments
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || !session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active benefit plans for the user's company
    const availablePlans = await db
      .select()
      .from(benefitPlans)
      .where(and(
        eq(benefitPlans.companyId, session.user.companyId),
        eq(benefitPlans.isActive, true)
      ));

    // Get user's current enrollments
    const userEnrollments = await db
      .select({
        enrollment: benefitEnrollments,
        plan: benefitPlans,
      })
      .from(benefitEnrollments)
      .innerJoin(benefitPlans, eq(benefitEnrollments.benefitPlanId, benefitPlans.id))
      .where(and(
        eq(benefitEnrollments.userId, session.user.id),
        eq(benefitEnrollments.status, 'active')
      ));

    // Calculate costs and savings
    const totalMonthlyCost = userEnrollments.reduce((sum, { enrollment }) => 
      sum + Number(enrollment.employeeContribution), 0
    );
    
    const employerContribution = userEnrollments.reduce((sum, { enrollment }) => 
      sum + Number(enrollment.employerContribution), 0
    );

    return NextResponse.json({
      availablePlans,
      currentEnrollments: userEnrollments,
      summary: {
        totalPlans: availablePlans.length,
        enrolledPlans: userEnrollments.length,
        monthlyEmployeeCost: totalMonthlyCost,
        monthlyEmployerContribution: employerContribution,
        annualEmployeeCost: totalMonthlyCost * 12,
        annualSavings: employerContribution * 12,
      }
    });
  } catch (error) {
    console.error('Error fetching employee benefits:', error);
    return NextResponse.json(
      { error: 'Failed to fetch benefits' },
      { status: 500 }
    );
  }
}