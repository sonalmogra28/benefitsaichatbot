/**
 * Simple Notification Service for Hybrid Architecture
 * Replaces complex Firebase-based notification system
 */

import { SimpleLogger } from './simple-logger';

export interface NotificationData {
  id?: string;
  userId: string;
  type: 'email' | 'push' | 'in-app';
  title: string;
  message: string;
  data?: Record<string, any>;
  createdAt?: Date;
  readAt?: Date;
  sentAt?: Date;
}

export class SimpleNotificationService {
  private notifications: Map<string, NotificationData> = new Map();

  async sendNotification(notification: Omit<NotificationData, 'id' | 'createdAt'>): Promise<string> {
    try {
      const id = crypto.randomUUID();
      const notificationData: NotificationData = {
        ...notification,
        id,
        createdAt: new Date()
      };

      this.notifications.set(id, notificationData);
      
      SimpleLogger.info('Notification sent', { 
        id, 
        userId: notification.userId, 
        type: notification.type 
      });

      return id;
    } catch (error) {
      SimpleLogger.error('Failed to send notification', error, { notification });
      throw error;
    }
  }

  async getNotifications(userId: string, limit = 50): Promise<NotificationData[]> {
    try {
      const userNotifications = Array.from(this.notifications.values())
        .filter(n => n.userId === userId)
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
        .slice(0, limit);

      return userNotifications;
    } catch (error) {
      SimpleLogger.error('Failed to get notifications', error, { userId });
      throw error;
    }
  }

  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notification = this.notifications.get(notificationId);
      if (notification) {
        notification.readAt = new Date();
        this.notifications.set(notificationId, notification);
      }
    } catch (error) {
      SimpleLogger.error('Failed to mark notification as read', error, { notificationId });
      throw error;
    }
  }

  async deleteNotification(notificationId: string): Promise<void> {
    try {
      this.notifications.delete(notificationId);
    } catch (error) {
      SimpleLogger.error('Failed to delete notification', error, { notificationId });
      throw error;
    }
  }
}

export const notificationService = new SimpleNotificationService();
