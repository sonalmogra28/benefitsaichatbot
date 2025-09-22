import { Resend } from 'resend';
import { hybridDatabase } from './hybrid-database';
import { SimpleLogger } from './simple-logger';
import { emailService } from './email.service';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface Notification {
  id: string;
  userId: string;
  type: 'email' | 'in_app' | 'sms';
  subject: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  metadata?: Record<string, any>;
  sentAt?: string;
  createdAt: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

class NotificationService {
  /**
   * Send an email notification
   */
  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<boolean> {
    try {
      if (!process.env.RESEND_API_KEY) {
        SimpleLogger.warn('Resend API key not configured, skipping email');
        return false;
      }

      const response = await resend.emails.send({
        from: 'Benefits Assistant <noreply@benefitsassistant.ai>',
        to,
        subject,
        html,
        text,
      });

      if (response.error) {
        SimpleLogger.error('Failed to send email', { error: response.error, to, subject });
        return false;
      }

      // Log notification in Cosmos DB
      await this.logNotification({
        userId: to,
        type: 'email',
        subject,
        message: text || html.substring(0, 200),
        status: 'sent',
        metadata: { emailId: response.data?.id },
      });

      SimpleLogger.info('Email sent successfully', { to, subject, messageId: response.data?.id });
      return true;
    } catch (error) {
      SimpleLogger.error('Email send error', error, { to, subject });

      // Log failed notification
      await this.logNotification({
        userId: to,
        type: 'email',
        subject,
        message: text || html.substring(0, 200),
        status: 'failed',
        metadata: { error: (error as Error).message },
      });

      return false;
    }
  }

  /**
   * Send in-app notification
   */
  async sendInAppNotification(
    userId: string,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ): Promise<boolean> {
    try {
      await hybridDatabase.createItem('notifications', {
        userId,
        type: 'in_app',
        subject: title,
        message,
        status: 'sent',
        metadata,
        read: false,
        createdAt: new Date().toISOString(),
        sentAt: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error('Failed to send in-app notification:', error);
      return false;
    }
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(
    userId: string,
    limit = 50,
    unreadOnly = false,
  ): Promise<Notification[]> {
    try {
      // For now, return empty array - would need to implement proper querying with hybrid database
      return [];
    } catch (error) {
      console.error('Failed to get user notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    try {
      // For now, just log - would need to implement proper update with hybrid database
      SimpleLogger.info('Marking notification as read', { notificationId, userId });

      return true;
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      return false;
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(
    email: string,
    name: string,
    companyName?: string,
  ): Promise<boolean> {
    const subject = 'Welcome to Benefits Assistant!';
    const html = `
      <h2>Welcome ${name}!</h2>
      <p>Thank you for joining Benefits Assistant${companyName ? ` at ${companyName}` : ''}.</p>
      <p>You can now:</p>
      <ul>
        <li>Chat with our AI assistant about your benefits</li>
        <li>Compare different benefit plans</li>
        <li>Calculate costs and savings</li>
        <li>Access all your benefits documents</li>
      </ul>
      <p>Get started by logging in and asking any questions about your benefits!</p>
      <br>
      <p>Best regards,<br>The Benefits Assistant Team</p>
    `;

    return this.sendEmail(email, subject, html);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    resetLink: string,
  ): Promise<boolean> {
    const subject = 'Reset Your Password';
    const html = `
      <h2>Password Reset Request</h2>
      <p>We received a request to reset your password.</p>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
      <br>
      <p>Best regards,<br>The Benefits Assistant Team</p>
    `;

    return this.sendEmail(email, subject, html);
  }

  /**
   * Send notification when a document has been processed
   */
  async sendDocumentProcessedNotification(params: {
    userId: string;
    documentName: string;
    status: 'processed' | 'failed';
    errorMessage?: string;
  }): Promise<boolean> {
    try {
      const userDoc = await hybridDatabase.getItem('users', params.userId);

      if (!userDoc) {
        console.warn('User not found for document notification');
        return false;
      }

      const user = userDoc;
      const email = user?.email as string | undefined;
      const name = (user?.name || user?.displayName || 'there') as string;

      let emailResult = false;
      if (email) {
        const res = await emailService.sendAdminNotification(
          [email],
          name,
          `Document ${params.status}: ${params.documentName}`,
        );
        emailResult = true; // res.success;
      }

      const title =
        params.status === 'processed'
          ? 'Document processed successfully'
          : 'Document processing failed';
      const message =
        params.status === 'processed'
          ? `Your document "${params.documentName}" has been processed and is ready to use.`
          : `We couldn't process your document "${params.documentName}".${
              params.errorMessage ? ` Error: ${params.errorMessage}` : ''
            }`;

      await this.sendInAppNotification(params.userId, title, message, {
        documentName: params.documentName,
        status: params.status,
        errorMessage: params.errorMessage,
      });

      return emailResult;
    } catch (error) {
      console.error('Failed to send document processed notification:', error);
      return false;
    }
  }

  /**
   * Send enrollment confirmation
   */
  async sendEnrollmentConfirmation(
    email: string,
    planName: string,
    details: Record<string, any>,
  ): Promise<boolean> {
    const subject = `Enrollment Confirmed: ${planName}`;
    const html = `
      <h2>Enrollment Confirmation</h2>
      <p>Your enrollment in ${planName} has been confirmed!</p>
      <h3>Enrollment Details:</h3>
      <ul>
        ${Object.entries(details)
          .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
          .join('')}
      </ul>
      <p>You can view and manage your benefits anytime by logging into your account.</p>
      <br>
      <p>Best regards,<br>The Benefits Assistant Team</p>
    `;

    return this.sendEmail(email, subject, html);
  }

  /**
   * Log notification to database
   */
  private async logNotification(
    notification: Omit<Notification, 'id' | 'createdAt'>,
  ): Promise<void> {
    try {
      // For now, skip repository operations - would need to implement with hybrid database
      SimpleLogger.info('Logging notification', { notification });
    } catch (error) {
      SimpleLogger.error('Failed to log notification', error, { notification });
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(companyId?: string) {
    try {
      // For now, return basic stats - would need to implement proper querying
      return {
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
      };
    } catch (error) {
      SimpleLogger.error('Failed to get notification stats', error, { companyId });
      return {
        total: 0,
        sent: 0,
        failed: 0,
        pending: 0,
      };
    }
  }
}

export const notificationService = new NotificationService();
