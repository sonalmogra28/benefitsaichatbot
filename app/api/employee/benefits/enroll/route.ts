import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/admin-middleware';
import { USER_ROLES } from '@/lib/constants/roles';
import {
  benefitService,
  benefitEnrollmentSchema,
} from '@/lib/firebase/services/benefit.service';
import { z } from 'zod';

// POST /api/employee/benefits/enroll - Enroll in a benefit plan
export const POST = withAuth(
  USER_ROLES.EMPLOYEE,
  async (request: NextRequest, context, user) => {
    try {
      const body = await request.json();
      const validated = benefitEnrollmentSchema.parse(body);

      // TODO: Verify the plan exists and belongs to user's company

      const enrollmentId = await benefitService.enrollInBenefitPlan(
        user.uid,
        user.companyId,
        validated,
      );

      return NextResponse.json(
        {
          success: true,
          enrollment: {
            id: enrollmentId,
            // TODO: Get plan name
            planName: 'Unknown',
            coverageType: validated.coverageType,
            effectiveDate: validated.electedOn,
            monthlyCost: validated.monthlyCost,
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
