import { Resend } from 'resend';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface Notification {
  id: string;
  userId: string;
  type: 'email' | 'in_app' | 'sms';
  subject: string;
  message: string;
  status: 'pending' | 'sent' | 'failed';
  metadata?: Record<string, any>;
  sentAt?: any;
  createdAt: any;
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
    text?: string
  ): Promise<boolean> {
    try {
      if (!process.env.RESEND_API_KEY) {
        console.warn('Resend API key not configured, skipping email');
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
        console.error('Failed to send email:', response.error);
        return false;
      }

      // Log notification in Firestore
      await this.logNotification({
        userId: to,
        type: 'email',
        subject,
        message: text || html.substring(0, 200),
        status: 'sent',
        metadata: { emailId: response.data?.id },
      });

      return true;
    } catch (error) {
      console.error('Email send error:', error);
      
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
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const notificationRef = db.collection('notifications').doc();
      
      await notificationRef.set({
        id: notificationRef.id,
        userId,
        type: 'in_app',
        subject: title,
        message,
        status: 'sent',
        metadata,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
        sentAt: FieldValue.serverTimestamp(),
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
    unreadOnly = false
  ): Promise<Notification[]> {
    try {
      let query = db
        .collection('notifications')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit);

      if (unreadOnly) {
        query = query.where('read', '==', false);
      }

      const snapshot = await query.get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Notification));
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
      const notificationRef = db.collection('notifications').doc(notificationId);
      const doc = await notificationRef.get();

      if (!doc.exists || doc.data()?.userId !== userId) {
        return false;
      }

      await notificationRef.update({
        read: true,
        readAt: FieldValue.serverTimestamp(),
      });

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
    companyName?: string
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
    resetLink: string
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
   * Send enrollment confirmation
   */
  async sendEnrollmentConfirmation(
    email: string,
    planName: string,
    details: Record<string, any>
  ): Promise<boolean> {
    const subject = `Enrollment Confirmed: ${planName}`;
    const html = `
      <h2>Enrollment Confirmation</h2>
      <p>Your enrollment in ${planName} has been confirmed!</p>
      <h3>Enrollment Details:</h3>
      <ul>
        ${Object.entries(details).map(([key, value]) => 
          `<li><strong>${key}:</strong> ${value}</li>`
        ).join('')}
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
    notification: Omit<Notification, 'id' | 'createdAt'>
  ): Promise<void> {
    try {
      const notificationRef = db.collection('notification_logs').doc();
      
      await notificationRef.set({
        id: notificationRef.id,
        ...notification,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to log notification:', error);
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(companyId?: string) {
    try {
      const collectionRef = db.collection('notification_logs');
      let queryRef: any;
      
      if (companyId) {
        // Would need to add companyId to notifications
        queryRef = collectionRef.where('companyId', '==', companyId);
      } else {
        queryRef = collectionRef;
      }
      
      const snapshot = await queryRef.get();
      
      const stats: any = {
        total: snapshot.size,
        sent: 0,
        failed: 0,
        pending: 0,
        byType: {
          email: 0,
          in_app: 0,
          sms: 0,
        },
      };
      
      snapshot.docs.forEach((doc: any) => {
        const data = doc.data();
        if (data.status && stats[data.status] !== undefined) {
          stats[data.status]++;
        }
        if (data.type && stats.byType[data.type] !== undefined) {
          stats.byType[data.type]++;
        }
      });
      
      return stats;
    } catch (error) {
      console.error('Failed to get notification stats:', error);
      return null;
    }
  }
}

export const notificationService = new NotificationService();