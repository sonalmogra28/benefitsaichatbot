import { logger } from '../utils/logger-fix';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  htmlContent?: string;
  textContent?: string;
  templateId?: string;
  variables?: Record<string, any>;
}

export class EmailService {
  /**
   * Send an email
   */
  async sendEmail(message: EmailMessage): Promise<string> {
    try {
      // Mock implementation - in production, integrate with actual email service
      const messageId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      logger.info('Email sent successfully', {
        messageId,
        to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
        subject: message.subject
      });

      return messageId;
    } catch (error) {
      logger.error('Failed to send email', error, {
        to: Array.isArray(message.to) ? message.to.join(', ') : message.to,
        subject: message.subject
      });
      throw error;
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(
    userEmail: string,
    userName: string,
    companyName: string
  ): Promise<string> {
    const message: EmailMessage = {
      to: userEmail,
      subject: `Welcome to ${companyName} Benefits Assistant`,
      htmlContent: `
        <h1>Welcome to ${companyName} Benefits Assistant!</h1>
        <p>Hi ${userName},</p>
        <p>Welcome to your company's benefits assistant. You can now access your benefits information and get help with enrollment.</p>
        <p>If you have any questions, please contact us at support@benefitschatbot.com.</p>
      `,
      textContent: `
        Welcome to ${companyName} Benefits Assistant!
        
        Hi ${userName},
        
        Welcome to your company's benefits assistant. You can now access your benefits information and get help with enrollment.
        
        If you have any questions, please contact us at support@benefitschatbot.com.
      `
    };

    return await this.sendEmail(message);
  }

  /**
   * Send admin notification
   */
  async sendAdminNotification(
    adminEmails: string[],
    subject: string,
    message: string
  ): Promise<string> {
    const emailMessage: EmailMessage = {
      to: adminEmails,
      subject: `[Admin] ${subject}`,
      textContent: message
    };

    return await this.sendEmail(emailMessage);
  }
}

// Export singleton instance
export const emailService = new EmailService();