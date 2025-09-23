import { logger } from '@/lib/logging/logger';
import { azureADB2CUserService, type CreateUserRequest } from '@/lib/azure/azure-ad-b2c-user-service';

export interface AdminAuthClaims {
  uid: string;
  email?: string;
  role?: string;
  companyId?: string;
  [key: string]: any;
}

export class AdminAuth {
  async verifySessionCookie(sessionCookie: string, checkRevoked?: boolean): Promise<AdminAuthClaims> {
    try {
      // For now, return a mock implementation
      // In production, this would verify the actual session cookie
      logger.info('Admin session verified', { sessionCookie: sessionCookie.substring(0, 10) + '...' });
      
      return {
        uid: 'admin-user-id',
        email: 'admin@example.com',
        role: 'super_admin',
        companyId: 'default-company'
      };
    } catch (error) {
      logger.error('Failed to verify admin session', error as Error);
      throw new Error('Invalid session cookie');
    }
  }

  async verifyIdToken(idToken: string): Promise<AdminAuthClaims> {
    try {
      // Mock implementation for now
      logger.info('Admin ID token verified', { idToken: idToken.substring(0, 10) + '...' });
      
      return {
        uid: 'admin-user-id',
        email: 'admin@example.com',
        role: 'super_admin',
        companyId: 'default-company'
      };
    } catch (error) {
      logger.error('Failed to verify admin ID token', error as Error);
      throw new Error('Invalid ID token');
    }
  }

  async createUser(userData: { 
    email: string; 
    displayName: string;
    firstName?: string;
    lastName?: string;
    companyId?: string;
    role?: string;
  }): Promise<{ uid: string }> {
    try {
      logger.info('Creating Azure AD B2C user', { 
        email: userData.email, 
        displayName: userData.displayName,
        companyId: userData.companyId,
        role: userData.role
      });

      // Parse display name to get first and last name
      const nameParts = userData.displayName.split(' ');
      const firstName = userData.firstName || nameParts[0] || '';
      const lastName = userData.lastName || nameParts.slice(1).join(' ') || '';

      const createUserRequest: CreateUserRequest = {
        displayName: userData.displayName,
        givenName: firstName,
        surname: lastName,
        mail: userData.email,
        accountEnabled: true,
        companyId: userData.companyId,
        role: userData.role,
      };

      const createdUser = await azureADB2CUserService.createUser(createUserRequest);
      
      logger.info('Azure AD B2C user created successfully', {
        uid: createdUser.id,
        email: createdUser.mail,
        displayName: createdUser.displayName
      });

      return {
        uid: createdUser.id
      };
    } catch (error) {
      logger.error('Failed to create Azure AD B2C user', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userData: {
          email: userData.email,
          displayName: userData.displayName
        }
      });
      throw new Error('Failed to create user');
    }
  }

  async getUserByEmail(email: string): Promise<AdminAuthClaims | null> {
    try {
      const user = await azureADB2CUserService.getUserByEmail(email);
      
      if (!user) {
        return null;
      }

      return {
        uid: user.id,
        email: user.mail,
        role: 'employee', // Default role, would be extracted from custom attributes
        companyId: 'default-company' // Would be extracted from custom attributes
      };
    } catch (error) {
      logger.error('Failed to get user by email', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        email
      });
      return null;
    }
  }

  async updateUser(userId: string, updates: Partial<CreateUserRequest>): Promise<void> {
    try {
      await azureADB2CUserService.updateUser(userId, updates);
      
      logger.info('Azure AD B2C user updated successfully', {
        userId,
        updates: Object.keys(updates)
      });
    } catch (error) {
      logger.error('Failed to update Azure AD B2C user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId,
        updates
      });
      throw new Error('Failed to update user');
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await azureADB2CUserService.deleteUser(userId);
      
      logger.info('Azure AD B2C user deleted successfully', { userId });
    } catch (error) {
      logger.error('Failed to delete Azure AD B2C user', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw new Error('Failed to delete user');
    }
  }
}

export const adminAuth = new AdminAuth();
