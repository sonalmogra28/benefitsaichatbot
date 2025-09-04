import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface GoogleWorkspaceUser {
  id: string;
  email: string;
  name: string;
  department?: string;
  jobTitle?: string;
  manager?: string;
  photoUrl?: string;
  isAdmin: boolean;
  createdAt: any;
  lastSyncedAt: any;
}

class GoogleWorkspaceService {
  private oauth2Client: OAuth2Client;
  
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Get authorization URL for Google Workspace
   */
  getAuthorizationUrl(state?: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/admin.directory.user.readonly',
      'https://www.googleapis.com/auth/admin.directory.group.readonly',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state,
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code: string) {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  /**
   * Sync users from Google Workspace to Firestore
   */
  async syncUsers(companyId: string, accessToken: string): Promise<number> {
    try {
      this.oauth2Client.setCredentials({ access_token: accessToken });
      
      const admin = google.admin({
        version: 'directory_v1',
        auth: this.oauth2Client,
      });

      // Get all users from Google Workspace
      const response = await admin.users.list({
        customer: 'my_customer',
        maxResults: 500,
      });

      const users = response.data.users || [];
      const batch = db.batch();
      let syncedCount = 0;

      for (const user of users) {
        if (!user.id || !user.primaryEmail) continue;

        const userRef = db.collection('google_workspace_users').doc(user.id);
        
        const userData: GoogleWorkspaceUser = {
          id: user.id,
          email: user.primaryEmail,
          name: user.name?.fullName || '',
          department: user.organizations?.[0]?.department,
          jobTitle: user.organizations?.[0]?.title,
          manager: user.relations?.find((r: any) => r.type === 'manager')?.value,
          photoUrl: user.thumbnailPhotoUrl || undefined,
          isAdmin: user.isAdmin || false,
          createdAt: FieldValue.serverTimestamp(),
          lastSyncedAt: FieldValue.serverTimestamp(),
        };

        batch.set(userRef, userData, { merge: true });

        // Also create/update in main users collection
        const mainUserRef = db.collection('users').doc(user.id);
        batch.set(mainUserRef, {
          email: user.primaryEmail,
          displayName: user.name?.fullName || '',
          companyId,
          role: user.isAdmin ? 'company-admin' : 'employee',
          googleWorkspaceId: user.id,
          updatedAt: FieldValue.serverTimestamp(),
        }, { merge: true });

        syncedCount++;
      }

      await batch.commit();

      // Log sync event
      await db.collection('sync_logs').add({
        companyId,
        type: 'google_workspace',
        usersSync: syncedCount,
        status: 'success',
        syncedAt: FieldValue.serverTimestamp(),
      });

      return syncedCount;
    } catch (error) {
      console.error('Google Workspace sync failed:', error);
      
      // Log failed sync
      await db.collection('sync_logs').add({
        companyId,
        type: 'google_workspace',
        status: 'failed',
        error: (error as Error).message,
        failedAt: FieldValue.serverTimestamp(),
      });
      
      throw error;
    }
  }

  /**
   * Get synced users for a company
   */
  async getSyncedUsers(companyId: string): Promise<GoogleWorkspaceUser[]> {
    try {
      const snapshot = await db
        .collection('users')
        .where('companyId', '==', companyId)
        .where('googleWorkspaceId', '!=', null)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as GoogleWorkspaceUser));
    } catch (error) {
      console.error('Failed to get synced users:', error);
      return [];
    }
  }

  /**
   * Check if company has Google Workspace integration
   */
  async hasIntegration(companyId: string): Promise<boolean> {
    try {
      const companyDoc = await db.collection('companies').doc(companyId).get();
      
      if (!companyDoc.exists) {
        return false;
      }

      const data = companyDoc.data();
      return !!(data?.integrations?.googleWorkspace?.enabled);
    } catch (error) {
      console.error('Failed to check Google Workspace integration:', error);
      return false;
    }
  }

  /**
   * Enable Google Workspace integration for a company
   */
  async enableIntegration(
    companyId: string,
    accessToken: string,
    refreshToken?: string
  ): Promise<boolean> {
    try {
      await db.collection('companies').doc(companyId).update({
        'integrations.googleWorkspace': {
          enabled: true,
          accessToken,
          refreshToken,
          enabledAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error('Failed to enable Google Workspace integration:', error);
      return false;
    }
  }

  /**
   * Disable Google Workspace integration
   */
  async disableIntegration(companyId: string): Promise<boolean> {
    try {
      await db.collection('companies').doc(companyId).update({
        'integrations.googleWorkspace': {
          enabled: false,
          disabledAt: FieldValue.serverTimestamp(),
        },
        updatedAt: FieldValue.serverTimestamp(),
      });

      return true;
    } catch (error) {
      console.error('Failed to disable Google Workspace integration:', error);
      return false;
    }
  }

  /**
   * Get sync history for a company
   */
  async getSyncHistory(companyId: string, limit = 10) {
    try {
      const snapshot = await db
        .collection('sync_logs')
        .where('companyId', '==', companyId)
        .where('type', '==', 'google_workspace')
        .orderBy('syncedAt', 'desc')
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Failed to get sync history:', error);
      return [];
    }
  }
}

export const googleWorkspaceService = new GoogleWorkspaceService();