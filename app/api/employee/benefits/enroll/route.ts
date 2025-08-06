import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/stack-auth';
import { db } from '@/lib/db';
import { benefitPlans, benefitEnrollments } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const enrollmentSchema = z.object({
  benefitPlanId: z.string().uuid(),
  coverageType: z.enum(['individual', 'family', 'employee_spouse', 'employee_children']),
  dependents: z.array(z.object({
    name: z.string(),
    relationship: z.enum(['spouse', 'child', 'other']),
    dateOfBirth: z.string(),
  })).optional(),
  effectiveDate: z.string(), // ISO date string
});

// POST /api/employee/benefits/enroll - Enroll in a benefit plan
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id || !session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = enrollmentSchema.parse(body);

    // Verify the plan exists and belongs to user's company
    const [plan] = await db
      .select()
      .from(benefitPlans)
      .where(and(
        eq(benefitPlans.id, validated.benefitPlanId),
        eq(benefitPlans.companyId, session.user.companyId),
        eq(benefitPlans.isActive, true)
      ))
      .limit(1);

    if (!plan) {
      return NextResponse.json(
        { error: 'Invalid benefit plan' },
        { status: 400 }
      );
    }

    // Check if user is already enrolled in this plan
    const existingEnrollment = await db
      .select()
      .from(benefitEnrollments)
      .where(and(
        eq(benefitEnrollments.userId, session.user.id),
        eq(benefitEnrollments.benefitPlanId, validated.benefitPlanId),
        eq(benefitEnrollments.status, 'active')
      ))
      .limit(1);

    if (existingEnrollment.length > 0) {
      return NextResponse.json(
        { error: 'Already enrolled in this plan' },
        { status: 400 }
      );
    }

    // Calculate costs based on coverage type
    let monthlyCost = Number(plan.monthlyPremiumEmployee || 0);
    if (validated.coverageType === 'family') {
      monthlyCost = Number(plan.monthlyPremiumFamily || plan.monthlyPremiumEmployee || 0);
    }

    // Calculate employer contribution (mock logic - would be based on company policy)
    const employerContribution = monthlyCost * 0.7; // 70% employer contribution
    const employeeContribution = monthlyCost - employerContribution;

    // Create enrollment
    const [enrollment] = await db
      .insert(benefitEnrollments)
      .values({
        userId: session.user.id,
        benefitPlanId: validated.benefitPlanId,
        coverageType: validated.coverageType,
        enrollmentDate: new Date(),
        effectiveDate: new Date(validated.effectiveDate),
        monthlyCost: monthlyCost.toString(),
        employerContribution: employerContribution.toString(),
        employeeContribution: employeeContribution.toString(),
        dependents: validated.dependents || [],
        status: 'active',
      })
      .returning();

    return NextResponse.json({
      success: true,
      enrollment: {
        id: enrollment.id,
        planName: plan.name,
        coverageType: enrollment.coverageType,
        effectiveDate: enrollment.effectiveDate,
        monthlyCost: enrollment.monthlyCost,
        employeeContribution: enrollment.employeeContribution,
        employerContribution: enrollment.employerContribution,
      }
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error enrolling in benefit:', error);
    return NextResponse.json(
      { error: 'Failed to enroll in benefit' },
      { status: 500 }
    );
  }
}

// DELETE /api/employee/benefits/enroll - Cancel enrollment
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const enrollmentId = searchParams.get('enrollmentId');

    if (!enrollmentId) {
      return NextResponse.json(
        { error: 'Enrollment ID required' },
        { status: 400 }
      );
    }

    // Verify enrollment belongs to user
    const [enrollment] = await db
      .select()
      .from(benefitEnrollments)
      .where(and(
        eq(benefitEnrollments.id, enrollmentId),
        eq(benefitEnrollments.userId, session.user.id)
      ))
      .limit(1);

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    // Update enrollment status to cancelled
    await db
      .update(benefitEnrollments)
      .set({
        status: 'cancelled',
        endDate: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(benefitEnrollments.id, enrollmentId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling enrollment:', error);
    return NextResponse.json(
      { error: 'Failed to cancel enrollment' },
      { status: 500 }
    );
  }
}