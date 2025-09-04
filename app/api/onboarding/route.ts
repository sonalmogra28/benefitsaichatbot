import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/admin-middleware';
import { USER_ROLES } from '@/lib/constants/roles';
import { onboardingService } from '@/lib/services/onboarding.service';

export const POST = withAuth(
  USER_ROLES.EMPLOYEE,
  async (request: NextRequest, context, user) => {
    try {
      // Parse request body
      const data = await request.json();

      // Complete onboarding
      await onboardingService.completeOnboarding(user.uid, data);

      return NextResponse.json({
        success: true,
        message: 'Onboarding completed successfully',
      });
    } catch (error) {
      console.error('Onboarding error:', error);
      return NextResponse.json(
        { error: 'Failed to complete onboarding' },
        { status: 500 },
      );
    }
  },
);

export const GET = withAuth(
  USER_ROLES.EMPLOYEE,
  async (request: NextRequest, context, user) => {
    try {
      // Get onboarding status
      const status = await onboardingService.getOnboardingStatus(user.uid);

      return NextResponse.json(status);
    } catch (error) {
      console.error('Get onboarding status error:', error);
      return NextResponse.json(
        { error: 'Failed to get onboarding status' },
        { status: 500 },
      );
    }
  },
);

export const PATCH = withAuth(
  USER_ROLES.EMPLOYEE,
  async (request: NextRequest, context, user) => {
    try {
      // Parse request body
      const { step, data } = await request.json();

      // Update onboarding progress
      await onboardingService.updateOnboardingProgress(user.uid, step, data);

      return NextResponse.json({
        success: true,
        message: 'Onboarding progress updated',
      });
    } catch (error) {
      console.error('Update onboarding progress error:', error);
      return NextResponse.json(
        { error: 'Failed to update onboarding progress' },
        { status: 500 },
      );
    }
  },
);
