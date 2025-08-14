import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { stackServerApp } from '@/stack';
import { userSyncService } from './user-sync.service';
import { emailService } from './email.service';

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
    data: OnboardingData
  ): Promise<void> {
    try {
      // Get Stack user
      const stackUser = await stackServerApp.getUser({ or: 'throw' });
      if (stackUser.id !== userId) {
        throw new Error(`User ID mismatch - expected ${userId}, got ${stackUser.id}`);
      }

      // Update user metadata with onboarding selections
      const metadata = {
        ...stackUser.clientMetadata,
        department: data.department,
        location: data.location,
        hireDate: data.hireDate,
        benefitsInterests: data.benefitsInterests,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString(),
      };

      await stackUser.update({
        clientMetadata: metadata,
      });

      // Update local database
      await db
        .update(users)
        .set({
          department: data.department,
          hireDate: data.hireDate || null,
          updatedAt: new Date(),
        })
        .where(eq(users.stackUserId, userId));

      // Sync with Stack Auth
      await userSyncService.syncCurrentUserToDb(stackUser);

      // Send welcome email
      await this.sendWelcomeEmail(stackUser.primaryEmail || '', stackUser.displayName || '');

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
      const stackUser = await stackServerApp.getUser({ or: 'throw' });
      if (stackUser.id !== userId) {
        throw new Error(`User ID mismatch - expected ${userId}, got ${stackUser.id}`);
      }

      const metadata = stackUser.clientMetadata || {};
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
    data: any
  ): Promise<void> {
    try {
      const stackUser = await stackServerApp.getUser({ or: 'throw' });
      if (stackUser.id !== userId) {
        throw new Error(`User ID mismatch - expected ${userId}, got ${stackUser.id}`);
      }

      // Save progress in metadata
      const onboardingProgress = stackUser.clientMetadata?.onboardingProgress || {};
      onboardingProgress[step] = {
        data,
        completedAt: new Date().toISOString(),
      };

      await stackUser.update({
        clientMetadata: {
          ...stackUser.clientMetadata,
          onboardingProgress,
          lastOnboardingStep: step,
        },
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
      await emailService.sendNotification({
        email,
        name,
        title: 'Welcome to Your Benefits Portal!',
        message: `
          <p>Congratulations on completing your onboarding! Here's what you can do next:</p>
          <ul style="margin: 20px 0;">
            <li><strong>Explore Your Benefits:</strong> Review all available benefit plans and their details</li>
            <li><strong>Use the Cost Calculator:</strong> Estimate your out-of-pocket costs for different scenarios</li>
            <li><strong>Ask Questions:</strong> Our AI assistant is here to help answer any benefits questions</li>
            <li><strong>Access Documents:</strong> Find important benefits documents and resources</li>
          </ul>
          <p>If you need any assistance, don't hesitate to reach out to your HR team or use the chat feature in the portal.</p>
        `,
        actionUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/benefits`,
      });
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
      const stackUser = await stackServerApp.getUser({ or: 'throw' });
      if (stackUser.id !== userId) {
        throw new Error(`User ID mismatch - expected ${userId}, got ${stackUser.id}`);
      }

      // Clear onboarding metadata
      const metadata = { ...stackUser.clientMetadata };
      metadata.onboardingCompleted = undefined;
      metadata.onboardingCompletedAt = undefined;
      metadata.onboardingProgress = undefined;
      metadata.lastOnboardingStep = undefined;
      metadata.benefitsInterests = undefined;

      await stackUser.update({
        clientMetadata: metadata,
      });

      // Update local database
      await db
        .update(users)
        .set({
          updatedAt: new Date(),
        })
        .where(eq(users.stackUserId, userId));

    } catch (error) {
      console.error('Failed to reset onboarding:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const onboardingService = new OnboardingService();
