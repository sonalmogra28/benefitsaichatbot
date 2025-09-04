import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Assuming your firebase init is in lib/firebase.ts

// Interfaces remain the same as they define the public contract of the service
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export interface UserInviteData {
  email: string;
  name: string;
  companyName: string;
  inviteLink: string;
  role: string;
}

export interface PasswordResetData {
  email: string;
  name: string;
  resetLink: string;
}

export interface NotificationData {
  email: string;
  name: string;
  title: string;
  message: string;
  actionUrl?: string;
}

export class EmailService {
  private fromEmail =
    process.env.FROM_EMAIL || 'Benefits Chatbot <noreply@yourdomain.com>'; // Update with a real domain
  private emailsCollection = collection(db, 'pending_emails');

  private async queueEmail(
    options: EmailOptions,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await addDoc(this.emailsCollection, {
        to: Array.isArray(options.to) ? options.to : [options.to],
        message: {
          subject: options.subject,
          html: options.html,
        },
        from: options.from || this.fromEmail,
        createdAt: serverTimestamp(),
        status: 'PENDING',
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to queue email in Firestore:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // sendUserInvite now uses queueEmail
  async sendUserInvite(
    data: UserInviteData,
  ): Promise<{ success: boolean; error?: string }> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ${data.companyName} Benefits Portal</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 300; }
            .content { background: #ffffff; padding: 40px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .role-badge { background: #f3f4f6; padding: 4px 12px; border-radius: 20px; font-size: 14px; color: #374151; display: inline-block; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ${data.companyName}</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.name}!</h2>
              <p>You've been invited to join the <strong>${data.companyName}</strong> benefits portal. This platform will help you understand and manage your employee benefits.</p>

              <div class="role-badge">Role: ${data.role.replace('_', ' ').toUpperCase()}</div>

              <p>With this portal, you can:</p>
              <ul>
                <li>View and compare benefit plans</li>
                <li>Calculate costs and savings</li>
                <li>Get AI-powered answers to benefits questions</li>
                <li>Access important documents and resources</li>
              </ul>

              <p>Click the button below to set up your account:</p>
              <a href="${data.inviteLink}" class="button">Accept Invitation</a>

              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${data.inviteLink}</p>

              <p>If you have any questions, feel free to reach out to your HR team.</p>

              <p>Best regards,<br>The ${data.companyName} Team</p>
            </div>
            <div class="footer">
              <p>This invitation was sent to ${data.email}. If you weren't expecting this email, you can safely ignore it.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.queueEmail({
      to: data.email,
      subject: `Welcome to ${data.companyName} Benefits Portal`,
      html,
    });
  }

  // sendPasswordReset now uses queueEmail
  async sendPasswordReset(
    data: PasswordResetData,
  ): Promise<{ success: boolean; error?: string }> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 300; }
            .content { background: #ffffff; padding: 40px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .warning { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.name}!</h2>
              <p>We received a request to reset your password for your benefits portal account.</p>

              <div class="warning">
                <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
              </div>

              <p>To reset your password, click the button below:</p>
              <a href="${data.resetLink}" class="button">Reset Password</a>

              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #dc2626;">${data.resetLink}</p>

              <p><strong>This link will expire in 24 hours</strong> for security reasons.</p>

              <p>If you continue to have problems, contact your HR team for assistance.</p>

              <p>Best regards,<br>The Benefits Portal Team</p>
            </div>
            <div class="footer">
              <p>This email was sent to ${data.email}. If you weren't expecting this email, you can safely ignore it.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.queueEmail({
      to: data.email,
      subject: 'Reset Your Benefits Portal Password',
      html,
    });
  }

  // sendNotification now uses queueEmail
  async sendNotification(
    data: NotificationData,
  ): Promise<{ success: boolean; error?: string }> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${data.title}</title>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 300; }
            .content { background: #ffffff; padding: 40px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .button { display: inline-block; background: #059669; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${data.title}</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.name}!</h2>
              <div style="font-size: 16px; margin: 20px 0;">
                ${data.message}
              </div>

              ${
                data.actionUrl
                  ? `
                <a href="${data.actionUrl}" class="button">View Details</a>
              `
                  : ''
              }

              <p>Best regards,<br>The Benefits Portal Team</p>
            </div>
            <div class="footer">
              <p>This notification was sent to ${data.email}.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.queueEmail({
      to: data.email,
      subject: data.title,
      html,
    });
  }

  // Helper methods for common notification types
  async sendDocumentProcessedNotification(
    email: string,
    name: string,
    documentName: string,
    status: 'processed' | 'failed',
    errorMessage?: string,
  ): Promise<{ success: boolean; error?: string }> {
    const title =
      status === 'processed'
        ? 'Document Processed Successfully'
        : 'Document Processing Failed';
    const message =
      status === 'processed'
        ? `Your document "${documentName}" has been successfully processed and is now searchable in your benefits portal.`
        : `There was an issue processing your document "${documentName}". ${errorMessage ? `Error: ${errorMessage}` : 'Please try uploading again.'}`;

    return this.sendNotification({
      email,
      name,
      title,
      message,
      actionUrl:
        status === 'processed'
          ? `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/documents`
          : `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/documents/upload`,
    });
  }

  async sendBenefitsReminderNotification(
    email: string,
    name: string,
    deadline: Date,
  ): Promise<{ success: boolean; error?: string }> {
    const title = 'Benefits Enrollment Reminder';
    const message = `Don't forget to complete your benefits enrollment! The deadline is ${deadline.toLocaleDateString()}. Make sure to review all your options and submit your selections on time.`;

    return this.sendNotification({
      email,
      name,
      title,
      message,
      actionUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/benefits`,
    });
  }

  async sendMaintenanceNotification(
    email: string,
    name: string,
    maintenanceDate: Date,
    duration: string,
  ): Promise<{ success: boolean; error?: string }> {
    const title = 'Scheduled System Maintenance';
    const message = `We will be performing scheduled maintenance on ${maintenanceDate.toLocaleDateString()} at ${maintenanceDate.toLocaleTimeString()}. The system will be unavailable for approximately ${duration}. We apologize for any inconvenience.`;

    return this.sendNotification({
      email,
      name,
      title,
      message,
    });
  }

  async sendEmployeeInvitation(data: {
    email: string;
    companyName: string;
    inviterName: string;
    role: string;
  }): Promise<{ success: boolean; error?: string }> {
    const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/signup?company=${encodeURIComponent(data.companyName)}&email=${encodeURIComponent(data.email)}`;

    return this.sendUserInvite({
      email: data.email,
      name: data.email.split('@')[0], // Use email prefix as temporary name
      companyName: data.companyName,
      inviteLink,
      role: data.role,
    });
  }
}

// Export a singleton instance
export const emailService = new EmailService();
