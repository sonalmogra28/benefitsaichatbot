import { hybridDatabase } from './hybrid-database';

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

export interface EmployeeInvitationData {
  email: string;
  companyName: string;
  inviterName: string;
  role: string;
}

export class EmailService {
  private fromEmail =
    process.env.FROM_EMAIL || 'Benefits Chatbot <noreply@yourdomain.com>';

  private async queueEmail(
    options: EmailOptions,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await hybridDatabase.createItem('pending_emails', {
        to: Array.isArray(options.to) ? options.to : [options.to],
        message: {
          subject: options.subject,
          html: options.html,
        },
        from: options.from || this.fromEmail,
        createdAt: new Date().toISOString(),
        status: 'PENDING',
      });
      return { success: true };
    } catch (error) {
      console.error('Failed to queue email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

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
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 300; }
            .content { background: #ffffff; padding: 40px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${data.name}!</h2>
              <p>We received a request to reset the password for your account.</p>

              <p>Click the button below to reset your password:</p>
              <a href="${data.resetLink}" class="button">Reset Password</a>

              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #667eea;">${data.resetLink}</p>

              <div class="warning">
                <strong>⚠️ Important:</strong> This password reset link will expire in 1 hour for security reasons.
              </div>

              <p>If you didn't request this password reset, you can safely ignore this email. Your password won't be changed unless you click the link above.</p>

              <p>Best regards,<br>The Benefits Portal Team</p>
            </div>
            <div class="footer">
              <p>This email was sent to ${data.email}. For security reasons, we recommend not forwarding this email to anyone.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    return this.queueEmail({
      to: data.email,
      subject: 'Reset Your Password - Benefits Portal',
      html,
    });
  }

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
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 300; }
            .content { background: #ffffff; padding: 40px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
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
              <p>${data.message}</p>

              ${
                data.actionUrl
                  ? `
                <p>Click the button below to take action:</p>
                <a href="${data.actionUrl}" class="button">View Details</a>

                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #667eea;">${data.actionUrl}</p>
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

  async sendEmployeeInvitation(
    data: EmployeeInvitationData,
  ): Promise<{ success: boolean; error?: string }> {
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/register?company=${encodeURIComponent(data.companyName)}`;

    return this.sendUserInvite({
      email: data.email,
      name: data.email.split('@')[0],
      companyName: data.companyName,
      inviteLink,
      role: data.role,
    });
  }
}

// Export a singleton instance
export const emailService = new EmailService();
