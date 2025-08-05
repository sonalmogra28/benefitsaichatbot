import { emailService } from '@/lib/services/email.service';
import { db } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface DocumentProcessedNotificationData {
  userId: string;
  documentName: string;
  status: 'processed' | 'failed';
  error?: string;
}

export interface BenefitsEnrollmentNotificationData {
  userId: string;
  enrollmentDetails: {
    planName: string;
    effectiveDate: string;
    premiumAmount: number;
  };
}

export class NotificationService {
  async sendDocumentProcessedNotification(data: DocumentProcessedNotificationData): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user and company details
      const [userWithCompany] = await db
        .select({
          user: users,
          company: companies,
        })
        .from(users)
        .leftJoin(companies, eq(users.companyId, companies.id))
        .where(eq(users.id, data.userId))
        .limit(1);

      if (!userWithCompany?.user) {
        return { success: false, error: 'User not found' };
      }

      const { user, company } = userWithCompany;
      const userName = `${user.firstName} ${user.lastName}`.trim();

      let title: string;
      let message: string;
      let actionUrl: string | undefined;

      if (data.status === 'processed') {
        title = 'Document Processed Successfully';
        message = `
          <p>Great news! Your document "<strong>${data.documentName}</strong>" has been successfully processed and is now available in your benefits portal.</p>
          <p>You can now:</p>
          <ul>
            <li>Search for information within this document</li>
            <li>Ask AI questions about the content</li>
            <li>Reference it in your benefits decisions</li>
          </ul>
        `;
        actionUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/documents`;
      } else {
        title = 'Document Processing Failed';
        message = `
          <p>We encountered an issue processing your document "<strong>${data.documentName}</strong>".</p>
          ${data.error ? `<p><strong>Error details:</strong> ${data.error}</p>` : ''}
          <p>Please try uploading the document again, or contact your HR team if the problem persists.</p>
        `;
        actionUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/documents/upload`;
      }

      return await emailService.sendNotification({
        email: user.email,
        name: userName,
        title,
        message,
        actionUrl,
      });
    } catch (error) {
      console.error('Failed to send document processed notification:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async sendBenefitsEnrollmentNotification(data: BenefitsEnrollmentNotificationData): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user and company details
      const [userWithCompany] = await db
        .select({
          user: users,
          company: companies,
        })
        .from(users)
        .leftJoin(companies, eq(users.companyId, companies.id))
        .where(eq(users.id, data.userId))
        .limit(1);

      if (!userWithCompany?.user) {
        return { success: false, error: 'User not found' };
      }

      const { user, company } = userWithCompany;
      const userName = `${user.firstName} ${user.lastName}`.trim();

      const title = 'Benefits Enrollment Confirmation';
      const message = `
        <p>Your benefits enrollment has been confirmed!</p>
        <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Enrollment Details</h3>
          <p><strong>Plan:</strong> ${data.enrollmentDetails.planName}</p>
          <p><strong>Effective Date:</strong> ${data.enrollmentDetails.effectiveDate}</p>
          <p><strong>Monthly Premium:</strong> $${data.enrollmentDetails.premiumAmount.toFixed(2)}</p>
        </div>
        <p>You can view your complete benefits summary and make changes during the next open enrollment period.</p>
      `;
      const actionUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/benefits/summary`;

      return await emailService.sendNotification({
        email: user.email,
        name: userName,
        title,
        message,
        actionUrl,
      });
    } catch (error) {
      console.error('Failed to send benefits enrollment notification:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async sendSystemMaintenanceNotification(userEmails: string[], scheduledTime: string, duration: string): Promise<{ success: boolean; error?: string }> {
    try {
      const title = 'Scheduled System Maintenance';
      const message = `
        <p>We will be performing scheduled maintenance on the benefits portal to improve your experience.</p>
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin-top: 0; color: #92400e;">Maintenance Schedule</h3>
          <p><strong>Start Time:</strong> ${scheduledTime}</p>
          <p><strong>Expected Duration:</strong> ${duration}</p>
        </div>
        <p>During this time, the portal may be temporarily unavailable. We apologize for any inconvenience and appreciate your patience.</p>
        <p>All services will be fully restored after the maintenance window.</p>
      `;

      const emailPromises = userEmails.map(email =>
        emailService.sendNotification({
          email,
          name: 'Valued User',
          title,
          message,
        })
      );

      const results = await Promise.all(emailPromises);
      const failedEmails = results.filter(result => !result.success);

      if (failedEmails.length > 0) {
        console.error(`Failed to send maintenance notifications to ${failedEmails.length} users`);
        return { 
          success: false, 
          error: `Failed to send notifications to ${failedEmails.length} users` 
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to send system maintenance notifications:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Export a singleton instance
export const notificationService = new NotificationService();
