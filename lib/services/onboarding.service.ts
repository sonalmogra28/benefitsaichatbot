import { getContainer } from '@/lib/azure/cosmos-db';
import { emailService } from './email.service';
import { userService } from './user.service';

export interface OnboardingData {
  role?: string;
  department?: string;
  location?: string;
  hireDate?: string;
  benefitsInterests?: string[];
}

export class OnboardingService {
  /**
   * Complete user onboarding and save selections
   */
  async completeOnboarding(
    userId: string,
    data: OnboardingData,
  ): Promise<void> {
    try {
      // Update user metadata with onboarding selections
      const metadata = {
        ...data,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString(),
      };

      await userService.updateUserMetadata(userId, metadata);

      // Send welcome email
      const user = await userService.getUserFromFirestore(userId);
      if (user) {
        await this.sendWelcomeEmail(user.email || '', user.displayName || '');
      }
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      throw error;
    }
  }

  /**
   * Get user's onboarding status
   */
  async getOnboardingStatus(userId: string): Promise<{
    completed: boolean;
    data?: OnboardingData;
    completedAt?: string;
  }> {
    try {
      const user = await userService.getUserFromFirestore(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const metadata = user.metadata || {};
      const completed = metadata.onboardingCompleted === true;

      if (completed) {
        return {
          completed: true,
          data: {
            department: metadata.department,
            location: metadata.location,
            hireDate: metadata.hireDate,
            benefitsInterests: metadata.benefitsInterests,
          },
          completedAt: metadata.onboardingCompletedAt,
        };
      }

      return { completed: false };
    } catch (error) {
      console.error('Failed to get onboarding status:', error);
      throw error;
    }
  }

  /**
   * Update onboarding progress
   */
  async updateOnboardingProgress(
    userId: string,
    step: string,
    data: any,
  ): Promise<void> {
    try {
      const user = await userService.getUserFromFirestore(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Save progress in metadata
      const onboardingProgress: any = user.metadata?.onboardingProgress || {};
      onboardingProgress[step] = {
        data,
        completedAt: new Date().toISOString(),
      };

      await userService.updateUserMetadata(userId, {
        ...user.metadata,
        onboardingProgress: onboardingProgress as any,
        lastOnboardingStep: step,
      });
    } catch (error) {
      console.error('Failed to update onboarding progress:', error);
      throw error;
    }
  }

  /**
   * Send welcome email after onboarding
   */
  private async sendWelcomeEmail(email: string, name: string): Promise<void> {
    try {
      await emailService.sendAdminNotification(
        [email],
        name,
        'Welcome to Your Benefits Portal!'
      );
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't throw - email failure shouldn't break onboarding
    }
  }

  /**
   * Reset onboarding for a user (admin action)
   */
  async resetOnboarding(userId: string): Promise<void> {
    try {
      const user = await userService.getUserFromFirestore(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Clear onboarding metadata
      const metadata = { ...user.metadata };
      metadata.onboardingCompleted = undefined;
      metadata.onboardingCompletedAt = undefined;
      metadata.onboardingProgress = undefined;
      metadata.lastOnboardingStep = undefined;
      metadata.benefitsInterests = undefined;

      await userService.updateUserMetadata(userId, metadata);
    } catch (error) {
      console.error('Failed to reset onboarding:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const onboardingService = new OnboardingService();
