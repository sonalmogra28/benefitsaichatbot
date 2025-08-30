import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type {
  CompanyCreateInput,
  CompanyUpdateInput,
  CompanyWithStats,
  UserWithCompany,
  BulkUserCreateInput,
  SystemAnalytics,
  AuditLog,
  DataExportRequest,
  SystemSettings,
  AuditAction,
} from '@/lib/types/super-admin';
import { emailService } from '@/lib/services/email.service';
import { auth } from 'firebase-admin';

export interface DashboardStats {
  totalCompanies: number;
  totalUsers: number;
  totalDocuments: number;
  activeChats: number;
  monthlyGrowth: number;
  systemHealth: 'healthy' | 'degraded' | 'down';
  apiUsage: number;
  storageUsed: number;
}

export interface ActivityLog {
  id: string;
  type: 'company_added' | 'user_enrolled' | 'document_uploaded' | 'plan_created' | 'data.exported';
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class SuperAdminService {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      // Fetch companies count
      const companiesSnapshot = await db.collection('companies').get();
      const totalCompanies = companiesSnapshot.size;

      // Fetch users count
      const usersSnapshot = await db.collection('users').get();
      const totalUsers = usersSnapshot.size;

      // Fetch documents count
      const documentsSnapshot = await db.collection('documents').get();
      const totalDocuments = documentsSnapshot.size;

      // Fetch active chats (created in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const activeChatsSnapshot = await db
        .collection('chats')
        .where('createdAt', '>=', thirtyDaysAgo)
        .get();
      const activeChats = activeChatsSnapshot.size;

      // Calculate monthly growth (compare to previous month)
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      
      const lastMonthCompanies = await db
        .collection('companies')
        .where('createdAt', '>=', sixtyDaysAgo)
        .where('createdAt', '<', thirtyDaysAgo)
        .get();
      
      const thisMonthCompanies = await db
        .collection('companies')
        .where('createdAt', '>=', thirtyDaysAgo)
        .get();
      
      const monthlyGrowth = lastMonthCompanies.size > 0
        ? ((thisMonthCompanies.size - lastMonthCompanies.size) / lastMonthCompanies.size) * 100
        : 0;

      // Check system health (simplified)
      const systemHealth = await this.checkSystemHealth();

      // Get API usage (from logs or monitoring)
      const apiUsage = await this.getApiUsage();

      // Get storage usage
      const storageUsed = await this.getStorageUsage();

      return {
        totalCompanies,
        totalUsers,
        totalDocuments,
        activeChats,
        monthlyGrowth: Math.round(monthlyGrowth * 10) / 10,
        systemHealth,
        apiUsage,
        storageUsed,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return default values on error
      return {
        totalCompanies: 0,
        totalUsers: 0,
        totalDocuments: 0,
        activeChats: 0,
        monthlyGrowth: 0,
        systemHealth: 'degraded',
        apiUsage: 0,
        storageUsed: 0,
      };
    }
  }

  /**
   * Get recent activity logs
   */
  async getRecentActivity(limit = 10): Promise<ActivityLog[]> {
    try {
      const logsSnapshot = await db
        .collection('activity_logs')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();

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
   * Create a new company
   */
  async createCompany(companyData: {
    name: string;
    domain?: string;
    employeeLimit?: number;
    adminEmail: string;
  }) {
    try {
      const companyRef = db.collection('companies').doc();
      
      const newCompany = {
        id: companyRef.id,
        name: companyData.name,
        domain: companyData.domain || null,
        employeeLimit: companyData.employeeLimit || 1000,
        adminEmail: companyData.adminEmail,
        status: 'active',
        employeeCount: 0,
        planCount: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        settings: {
          allowSelfRegistration: false,
          requireEmailVerification: true,
          defaultRole: 'employee',
        },
      };

      await companyRef.set(newCompany);

      // Log the activity
      await this.logActivity({
        type: 'company_added',
        message: `New company "${companyData.name}" registered`,
        metadata: { companyId: companyRef.id },
      });

      return { ...newCompany, id: companyRef.id };
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  }

  /**
   * Get all companies with pagination
   */
  async getCompanies(limit = 20, startAfter?: string) {
    try {
      let query = db
        .collection('companies')
        .orderBy('createdAt', 'desc')
        .limit(limit);

      if (startAfter) {
        const startDoc = await db.collection('companies').doc(startAfter).get();
        query = query.startAfter(startDoc);
      }

      const snapshot = await query.get();

      return {
        companies: snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })),
        hasMore: snapshot.size === limit,
        lastDoc: snapshot.docs[snapshot.docs.length - 1]?.id,
      };
    } catch (error) {
      console.error('Error fetching companies:', error);
      return { companies: [], hasMore: false, lastDoc: null };
    }
  }

  /**
   * Update company status
   */
  async updateCompanyStatus(companyId: string, status: 'active' | 'suspended' | 'inactive') {
    try {
      await db.collection('companies').doc(companyId).update({
        status,
        updatedAt: FieldValue.serverTimestamp(),
      });

      await this.logActivity({
        type: 'company_added',
        message: `Company status updated to ${status}`,
        metadata: { companyId, status },
      });

      return true;
    } catch (error) {
      console.error('Error updating company status:', error);
      return false;
    }
  }

  /**
   * Get platform-wide analytics
   */
  async getAnalytics(timeRange: 'day' | 'week' | 'month' | 'year' = 'month') {
    try {
      const now = new Date();
      let startDate = new Date();
      
      switch (timeRange) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Fetch various metrics
      const [chats, messages, documents, users] = await Promise.all([
        db.collection('chats').where('createdAt', '>=', startDate).get(),
        db.collection('messages').where('createdAt', '>=', startDate).get(),
        db.collection('documents').where('uploadedAt', '>=', startDate).get(),
        db.collection('users').where('createdAt', '>=', startDate).get(),
      ]);

      return {
        timeRange,
        metrics: {
          totalChats: chats.size,
          totalMessages: messages.size,
          documentsUploaded: documents.size,
          newUsers: users.size,
        },
        // Add more detailed analytics as needed
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return null;
    }
  }

  /**
   * Check system health
   */
  private async checkSystemHealth(): Promise<'healthy' | 'degraded' | 'down'> {
    try {
      // Simple health check - try to read from Firestore
      const testRead = await db.collection('companies').limit(1).get();
      
      if (testRead) {
        return 'healthy';
      }
      return 'degraded';
    } catch (error) {
      console.error('System health check failed:', error);
      return 'down';
    }
  }

  /**
   * Get API usage metrics
   */
  private async getApiUsage(): Promise<number> {
    try {
      // This would typically come from a monitoring service
      // For now, return a mock value
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const apiLogsSnapshot = await db
        .collection('api_logs')
        .where('timestamp', '>=', thirtyDaysAgo)
        .get();
      
      return apiLogsSnapshot.size || 0;
    } catch (error) {
      console.error('Error fetching API usage:', error);
      return 0;
    }
  }

  /**
   * Get storage usage
   */
  private async getStorageUsage(): Promise<number> {
    try {
      // This would typically come from Firebase Storage API
      // For now, calculate based on document count
      const documentsSnapshot = await db.collection('documents').get();
      
      // Assume average document size of 0.5MB
      const estimatedSizeGB = (documentsSnapshot.size * 0.5) / 1024;
      
      return Math.round(estimatedSizeGB * 10) / 10;
    } catch (error) {
      console.error('Error fetching storage usage:', error);
      return 0;
    }
  }

  /**
   * Log activity
   */
  private async logActivity(activity: Omit<ActivityLog, 'id' | 'timestamp'>) {
    try {
      const logRef = db.collection('activity_logs').doc();
      
      await logRef.set({
        id: logRef.id,
        ...activity,
        timestamp: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  async exportData(request: DataExportRequest): Promise<any> {
    const exports: Record<string, any[]> = {};

    if (request.includeTypes.includes('companies')) {
      const companiesSnapshot = await db.collection('companies')
        .orderBy('createdAt', 'desc')
        .get();
      exports.companies = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    if (request.includeTypes.includes('users')) {
      let usersQuery: FirebaseFirestore.Query = db.collection('users');
      if (request.companyId) {
        usersQuery = usersQuery.where('companyId', '==', request.companyId);
      }
      const usersSnapshot = await usersQuery.orderBy('createdAt', 'desc').get();
      exports.users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    if (request.includeTypes.includes('documents')) {
      let documentsQuery: FirebaseFirestore.Query = db.collection('documents');
      if (request.companyId) {
        documentsQuery = documentsQuery.where('companyId', '==', request.companyId);
      }
      const documentsSnapshot = await documentsQuery.orderBy('uploadedAt', 'desc').get();
      exports.documents = documentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    // TODO: Add date range filtering
    // TODO: Add format conversion (CSV, Excel)

    await this.logActivity({
      type: 'data.exported',
      message: `Data export initiated for types: ${request.includeTypes.join(', ')}`,
      metadata: { types: request.includeTypes, companyId: request.companyId, format: request.format },
    });

    return exports;
  }

  /**
   * Get system settings
   */
  async getSystemSettings(): Promise<SystemSettings> {
    try {
      const settingsDoc = await db.collection('system').doc('settings').get();
      
      if (!settingsDoc.exists) {
        // Return default settings if not found
        return this.getDefaultSettings();
      }
      
      return settingsDoc.data() as SystemSettings;
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
      
      await settingsRef.set({
        ...settings,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });

      await this.logActivity({
        type: 'company_added',
        message: 'System settings updated',
        metadata: { settings },
      });
    } catch (error) {
      console.error('Error updating system settings:', error);
      throw error;
    }
  }

  /**
   * Get default system settings
   */
  private getDefaultSettings(): SystemSettings {
    return {
      maintenanceMode: false,
      signupsEnabled: true,
      defaultBillingPlan: 'free',
      maxCompaniesPerDomain: 10,
      emailSettings: {
        provider: 'smtp',
        fromEmail: 'noreply@benefitschatbot.com',
        fromName: 'Benefits Chatbot',
      },
      storageSettings: {
        provider: 'gcs',
        maxFileSizeMB: 10,
        allowedFileTypes: ['pdf', 'doc', 'docx', 'txt', 'csv'],
      },
      aiSettings: {
        provider: 'openai',
        model: 'gpt-4',
        maxTokensPerRequest: 4096,
        rateLimitPerMinute: 60,
      },
      featureFlags: {},
    };
  }

  /**
   * Update a user
   */
  async updateUser(userId: string, updates: any): Promise<any> {
    try {
      const userRef = db.collection('users').doc(userId);
      
      // Get the user first
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      // Update the user
      await userRef.update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Also update in Firebase Auth if email is being changed
      if (updates.email) {
        await auth().updateUser(userId, {
          email: updates.email,
        });
      }

      await this.logActivity({
        type: 'user_enrolled',
        message: `User ${userId} updated`,
        metadata: { userId, updates },
      });

      // Return the updated user
      const updatedDoc = await userRef.get();
      return { id: updatedDoc.id, ...updatedDoc.data() };
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete a user
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      // Delete from Firestore
      await db.collection('users').doc(userId).delete();
      
      // Delete from Firebase Auth
      try {
        await auth().deleteUser(userId);
      } catch (authError) {
        console.error('Error deleting user from Auth:', authError);
        // Continue even if Auth deletion fails
      }

      await this.logActivity({
        type: 'user_enrolled',
        message: `User ${userId} deleted`,
        metadata: { userId },
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

export const superAdminService = new SuperAdminService();
export { SuperAdminService };