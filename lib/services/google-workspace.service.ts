import { google } from 'googleapis';
import { getRepositories } from '@/lib/azure/cosmos';
import { logger } from '../utils/logger-fix';
import { azureOpenAIService } from '@/lib/azure/openai';
import { azureAuthService } from '@/lib/azure/auth';
import { getStorageServices } from '@/lib/azure/storage';
import { redisService } from '@/lib/azure/redis';
import type { OAuth2Client } from 'google-auth-library';



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
      process.env.GOOGLE_REDIRECT_URI,
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
   * Sync users from Google Workspace to Cosmos DB
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
      const repositories = await getRepositories();
      let syncedCount = 0;

      for (const user of users) {
        if (!user.id || !user.primaryEmail) continue;

        const userData: GoogleWorkspaceUser = {
          id: user.id,
          email: user.primaryEmail,
          name: user.name?.fullName || '',
          department: user.organizations?.[0]?.department,
          jobTitle: user.organizations?.[0]?.title,
          manager: user.relations?.find((r: any) => r.type === 'manager')
            ?.value,
          photoUrl: user.thumbnailPhotoUrl || undefined,
          isAdmin: user.isAdmin || false,
          createdAt: new Date(),
          lastSyncedAt: new Date(),
        };

        // Store Google Workspace user data
        await repositories.documents.create({
          ...userData,
          type: 'google_workspace_user',
          companyId,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Also create/update in main users collection
        const existingUser = await repositories.users.getById(user.id, companyId);
        if (existingUser) {
          await repositories.users.update(user.id, {
            email: user.primaryEmail,
            displayName: user.name?.fullName || '',
            companyId,
            role: user.isAdmin ? 'company-admin' : 'employee',
            googleWorkspaceId: user.id,
            updatedAt: new Date(),
          }, companyId);
        } else {
          await repositories.users.create({
            id: user.id,
            email: user.primaryEmail,
            displayName: user.name?.fullName || '',
            companyId,
            role: user.isAdmin ? 'company-admin' : 'employee',
            googleWorkspaceId: user.id,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        syncedCount++;
      }

      // Log sync event
      await repositories.documents.create({
        id: `sync_${Date.now()}`,
        type: 'sync_log',
        companyId,
        syncType: 'google_workspace',
        usersSynced: syncedCount,
        status: 'success',
        syncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      logger.info('Google Workspace sync completed successfully', {
        companyId,
        usersSynced: syncedCount
      });

      return syncedCount;
    } catch (error) {
      logger.error('Google Workspace sync failed:', error);

      // Log failed sync
      try {
        const repositories = await getRepositories();
        await repositories.documents.create({
          id: `sync_error_${Date.now()}`,
          type: 'sync_log',
          companyId,
          syncType: 'google_workspace',
          status: 'failed',
          error: (error as Error).message,
          failedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } catch (logError) {
        logger.error('Failed to log sync error:', logError);
      }

      throw error;
    }
  }

  /**
   * Get synced users for a company
   */
  async getSyncedUsers(companyId: string): Promise<GoogleWorkspaceUser[]> {
    try {
      const repositories = await getRepositories();
      const query = `SELECT * FROM c WHERE c.companyId = @companyId AND c.googleWorkspaceId != null`;
      const parameters = [{ name: '@companyId', value: companyId }];
      
      const { resources: users } = await repositories.users.query(query, parameters);

      return users.map((user: any) => ({
        id: user.id,
        ...user,
      })) as GoogleWorkspaceUser[];
    } catch (error) {
      logger.error('Failed to get synced users:', error as Error);
      return [];
    }
  }

  /**
   * Check if company has Google Workspace integration
   */
  async hasIntegration(companyId: string): Promise<boolean> {
    try {
      const repositories = await getRepositories();
      const companyDoc = await repositories.companies.getById(companyId);

      if (!companyDoc) {
        return false;
      }

      return !!companyDoc?.integrations?.googleWorkspace?.enabled;
    } catch (error) {
      logger.error('Failed to check Google Workspace integration:', error);
      return false;
    }
  }

  /**
   * Enable Google Workspace integration for a company
   */
  async enableIntegration(
    companyId: string,
    accessToken: string,
    refreshToken?: string,
  ): Promise<boolean> {
    try {
      const repositories = await getRepositories();
      const company = await repositories.companies.getById(companyId);
      
      if (!company) {
        throw new Error('Company not found');
      }

      await repositories.companies.update(companyId, {
        integrations: {
          ...company.integrations,
          googleWorkspace: {
            enabled: true,
            accessToken,
            refreshToken,
            enabledAt: new Date().toISOString(),
          }
        },
        updatedAt: new Date().toISOString(),
      }, companyId);

      return true;
    } catch (error) {
      logger.error('Failed to enable Google Workspace integration:', error as Error);
      return false;
    }
  }

  /**
   * Disable Google Workspace integration
   */
  async disableIntegration(companyId: string): Promise<boolean> {
    try {
      const repositories = await getRepositories();
      const company = await repositories.companies.getById(companyId);
      
      if (!company) {
        throw new Error('Company not found');
      }

      await repositories.companies.update(companyId, {
        integrations: {
          ...company.integrations,
          googleWorkspace: {
            enabled: false,
            disabledAt: new Date().toISOString(),
          }
        },
        updatedAt: new Date().toISOString(),
      }, companyId);

      return true;
    } catch (error) {
      logger.error('Failed to disable Google Workspace integration:', error as Error);
      return false;
    }
  }

  /**
   * Get sync history for a company
   */
  async getSyncHistory(companyId: string, limit = 10) {
    try {
      const repositories = await getRepositories();
      const query = `SELECT TOP @limit * FROM c WHERE c.companyId = @companyId AND c.type = @type ORDER BY c.syncedAt DESC`;
      const parameters = [
        { name: '@companyId', value: companyId },
        { name: '@type', value: 'google_workspace' },
        { name: '@limit', value: limit }
      ];
      
      const { resources: syncLogs } = await repositories.documents.query(query, parameters);

      return syncLogs.map((log: any) => ({
        id: log.id,
        ...log,
      }));
    } catch (error) {
      logger.error('Failed to get sync history:', error as Error);
      return [];
    }
  }
}

export const googleWorkspaceService = new GoogleWorkspaceService();
