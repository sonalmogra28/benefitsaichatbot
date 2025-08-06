import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/stack-auth';
import { onboardingService } from '@/lib/services/onboarding.service';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const data = await request.json();

    // Complete onboarding
    await onboardingService.completeOnboarding(session.user.stackUserId, data);

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get onboarding status
    const status = await onboardingService.getOnboardingStatus(session.user.stackUserId);

    return NextResponse.json(status);

  } catch (error) {
    console.error('Get onboarding status error:', error);
    return NextResponse.json(
      { error: 'Failed to get onboarding status' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const { step, data } = await request.json();

    // Update onboarding progress
    await onboardingService.updateOnboardingProgress(
      session.user.stackUserId,
      step,
      data
    );

    return NextResponse.json({
      success: true,
      message: 'Onboarding progress updated',
    });

  } catch (error) {
    console.error('Update onboarding progress error:', error);
    return NextResponse.json(
      { error: 'Failed to update onboarding progress' },
      { status: 500 }
    );
  }
}
