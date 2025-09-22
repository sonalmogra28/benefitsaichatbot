import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/admin-middleware';
import { USER_ROLES } from '@/lib/constants/roles';
import { getContainer } from '@/lib/azure/cosmos-db';
import { benefitService } from '@/lib/services/benefit-service';
import { benefitEnrollmentSchema } from '@/lib/schemas/benefits';
import { z } from 'zod';

// POST /api/employee/benefits/enroll - Enroll in a benefit plan
export const POST = withAuth(
  USER_ROLES.EMPLOYEE,
  async (request: NextRequest, context: any, user: any) => {
    try {
      const body = await request.json();
      const validated = benefitEnrollmentSchema.parse(body);

      // Verify the plan exists and belongs to user's company
      const companyPlans = await benefitService.getBenefitPlans(user.companyId);
      const plan = companyPlans.find(p => p.id === validated.planId);
      
      if (!plan) {
        return NextResponse.json(
          { error: 'Benefit plan not found or not available for your company' },
          { status: 404 }
        );
      }

      // Verify plan is active
      if (!plan.isActive) {
        return NextResponse.json(
          { error: 'Benefit plan is not currently active' },
          { status: 400 }
        );
      }

      const enrollmentId = await benefitService.enrollInBenefit({
        ...validated,
        employeeId: user.uid,
      });

      return NextResponse.json(
        {
          success: true,
          enrollment: {
            id: enrollmentId,
            planName: plan.name,
            coverageType: validated.coverageType,
            effectiveDate: validated.startDate,
            monthlyCost: plan.monthlyCost,
          },
        },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.errors },
          { status: 400 },
        );
      }

      console.error('Error enrolling in benefit:', error);
      return NextResponse.json(
        { error: 'Failed to enroll in benefit' },
        { status: 500 },
      );
    }
  },
);

// DELETE /api/employee/benefits/enroll - Cancel enrollment
export const DELETE = withAuth(
  USER_ROLES.EMPLOYEE,
  async (request: NextRequest, context, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const enrollmentId = searchParams.get('enrollmentId');

      if (!enrollmentId) {
        return NextResponse.json(
          { error: 'Enrollment ID required' },
          { status: 400 },
        );
      }

      await benefitService.cancelBenefitEnrollment(user.uid, enrollmentId);

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error cancelling enrollment:', error);
      return NextResponse.json(
        { error: 'Failed to cancel enrollment' },
        { status: 500 },
      );
    }
  },
);
