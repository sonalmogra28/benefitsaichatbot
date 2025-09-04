
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getBucketSize } from '@/lib/firebase/storage';
import type { SystemSettings } from '@/lib/types/super-admin';
import { auth } from 'firebase-admin';

// Simplified single-tenant stats
export interface PlatformStats {
  totalUsers: number;
  totalDocuments: number;
  totalBenefitPlans: number;
  storageUsed: number; // in GB
}

export interface ActivityLog {
  id: string;
  type: 'user_added' | 'user_deleted' | 'document_uploaded' | 'settings_updated';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class SuperAdminService {
  /**
   * Get platform-wide statistics for the dashboard
   */
  async getPlatformStats(): Promise<PlatformStats> {
    try {
      const usersSnapshot = await db.collection('users').get();
      const documentsSnapshot = await db.collection('documents').get();
      const benefitPlansSnapshot = await db.collection('benefitPlans').get();

      const storageUsed = await this.getStorageUsage();

      return {
        totalUsers: usersSnapshot.size,
        totalDocuments: documentsSnapshot.size,
        totalBenefitPlans: benefitPlansSnapshot.size,
        storageUsed,
      };
    } catch (error) {
      console.error('Error fetching platform stats:', error);
      // Return a zeroed-out object on failure
      return {
        totalUsers: 0,
        totalDocuments: 0,
        totalBenefitPlans: 0,
        storageUsed: 0,
      };
    }
  }

  /**
   * Get recent activity logs for the platform
   */
  async getRecentActivity(limit = 10): Promise<ActivityLog[]> {
    try {
      const logsSnapshot = await db.collection('activity_logs').orderBy('timestamp', 'desc').limit(limit).get();
      return logsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          message: data.message,
          timestamp: data.timestamp?.toDate() || new Date(),
          metadata: data.metadata,
        };
      });
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      return [];
    }
  }

  /**
   * Get system settings
   */
  async getSystemSettings(): Promise<SystemSettings> {
    try {
      const settingsDoc = await db.collection('system').doc('settings').get();
      return settingsDoc.exists ? (settingsDoc.data() as SystemSettings) : this.getDefaultSettings();
    } catch (error) {
      console.error('Error fetching system settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Update system settings
   */
  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<void> {
    try {
      const settingsRef = db.collection('system').doc('settings');
      await settingsRef.set({ ...settings, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      await this.logActivity({ type: 'settings_updated', message: 'System settings updated', metadata: { settings } });
    } catch (error) {
      console.error('Error updating system settings:', error);
      throw error;
    }
  }

  /**
   * Get storage usage
   */
  private async getStorageUsage(): Promise<number> {
    try {
      const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      if (!bucketName) {
        console.warn('Firebase Storage bucket name not configured.');
        return 0;
      }
      const totalSizeInBytes = await getBucketSize(bucketName);
      const totalSizeInGB = totalSizeInBytes / (1024 * 1024 * 1024);
      return Math.round(totalSizeInGB * 100) / 100;
    } catch (error) {
      console.error('Error fetching storage usage:', error);
      return 0;
    }
  }

  /**
   * Log platform activity
   */
  private async logActivity(activity: Omit<ActivityLog, 'id' | 'timestamp'>) {
    try {
      const logRef = db.collection('activity_logs').doc();
      await logRef.set({ id: logRef.id, ...activity, timestamp: FieldValue.serverTimestamp() });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  /**
   * Defines default system settings
   */
  private getDefaultSettings(): SystemSettings {
    return {
      maintenanceMode: false,
      signupsEnabled: true,
      emailSettings: { fromEmail: 'noreply@benefitschatbot.com', fromName: 'Benefits Chatbot' },
      storageSettings: { maxFileSizeMB: 25, allowedFileTypes: ['pdf', 'md'] },
      aiSettings: { provider: 'VertexAI', model: 'gemini-1.5-pro-preview-0409', rateLimitPerMinute: 60 },
      featureFlags: {},
    };
  }
}

export const superAdminService = new SuperAdminService();
export { SuperAdminService };
