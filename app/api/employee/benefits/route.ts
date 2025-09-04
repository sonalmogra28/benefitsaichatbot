import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/admin-middleware';
import { USER_ROLES } from '@/lib/constants/roles';
import { benefitService } from '@/lib/firebase/services/benefit.service';
import type { BenefitsSummary } from '@/types/api';

export const GET = withAuth(
  USER_ROLES.EMPLOYEE,
  async (request: NextRequest, context, user) => {
    try {
      const enrollments = await benefitService.getBenefitEnrollments(user.uid);

      const summary: BenefitsSummary = {
        healthPlan: undefined, // TODO: Implement health plan summary
        coverageTypes: enrollments.map((e) => ({
          type: 'health', // TODO: Get type from benefit plan
          status: e.status,
          monthlyPremium: e.monthlyCost,
          coverageLevel: e.coverageType,
        })),
        upcomingDeadlines: [
          {
            event: 'Open Enrollment',
            date: '2025-11-15',
            daysRemaining: 90, // Mock data
          },
        ],
        savingsOpportunity: {
          amount: 350,
          recommendation:
            'Consider switching to the HDHP plan to save on premiums.',
        },
      };

      return NextResponse.json(summary);
    } catch (error) {
      console.error('Error fetching benefits summary:', error);
      return NextResponse.json(
        { error: 'Failed to fetch benefits summary' },
        { status: 500 },
      );
    }
  },
);
