import { getRepositories } from '@/lib/azure/cosmos';
import { logger } from '@/lib/logging/logger';

export interface UserMetadata {
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string;
  preferences?: any;
  [key: string]: any;
}

export class UserService {
  private userRepository: any;

  constructor() {
    this.initializeRepository();
  }

  private async initializeRepository() {
    const repositories = await getRepositories();
    this.userRepository = repositories.users;
  }

  async updateUserMetadata(userId: string, metadata: UserMetadata): Promise<void> {
    try {
      await this.userRepository.update(userId, {
        ...metadata,
        updatedAt: new Date().toISOString()
      }, userId);
      
      logger.info('User metadata updated', { userId, metadata });
    } catch (error) {
      logger.error('Failed to update user metadata', error as Error, { userId });
      throw error;
    }
  }

  async getUserFromFirestore(userId: string): Promise<any> {
    try {
      const user = await this.userRepository.getById(userId);
      return user;
    } catch (error) {
      logger.error('Failed to get user from database', error as Error, { userId });
      return null;
    }
  }

  async getUserById(userId: string): Promise<any> {
    return this.getUserFromFirestore(userId);
  }

  async listUsers(options: { companyId: string; limit?: number; offset?: number }): Promise<any[]> {
    try {
      await this.initializeRepository();
      
      // Query users by company ID with pagination
      const query = `
        SELECT * FROM c 
        WHERE c.companyId = @companyId 
        ORDER BY c.createdAt DESC
        OFFSET @offset LIMIT @limit
      `;
      
      const parameters = [
        { name: '@companyId', value: options.companyId },
        { name: '@offset', value: options.offset || 0 },
        { name: '@limit', value: options.limit || 50 }
      ];
      
      const result = await this.userRepository.query(query, parameters);
      
      logger.info('Users listed successfully', {
        companyId: options.companyId,
        limit: options.limit,
        offset: options.offset,
        resultCount: result.resources.length
      });
      
      return result.resources;
    } catch (error) {
      logger.error('Failed to list users', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        options 
      });
      return [];
    }
  }

  async assignUserToCompany(userId: string, companyId: string): Promise<void> {
    try {
      await this.initializeRepository();
      
      // Get the user first
      const user = await this.userRepository.getById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      // Update user with company ID
      await this.userRepository.update(userId, {
        ...user,
        companyId,
        updatedAt: new Date().toISOString()
      }, userId);
      
      logger.info('User assigned to company', { userId, companyId });
    } catch (error) {
      logger.error('Failed to assign user to company', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        userId, 
        companyId 
      });
      throw error;
    }
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    try {
      await this.initializeRepository();
      
      // Get the user first
      const user = await this.userRepository.getById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      // Update user with new role
      await this.userRepository.update(userId, {
        ...user,
        role,
        updatedAt: new Date().toISOString()
      }, userId);
      
      logger.info('User role updated', { userId, role });
    } catch (error) {
      logger.error('Failed to update user role', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        userId, 
        role 
      });
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      await this.initializeRepository();
      
      // Check if user exists
      const user = await this.userRepository.getById(userId);
      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }
      
      // Delete user from Cosmos DB
      await this.userRepository.delete(userId, userId);
      
      logger.info('User deleted', { userId });
    } catch (error) {
      logger.error('Failed to delete user', { 
        error: error instanceof Error ? error.message : 'Unknown error', 
        userId 
      });
      throw error;
    }
  }

  async updateUser(userId: string, updates: Partial<any>): Promise<void> {
    try {
      await this.userRepository.update(userId, {
        ...updates,
        updatedAt: new Date().toISOString()
      }, userId);
      
      logger.info('User updated', { userId, updates });
    } catch (error) {
      logger.error('Failed to update user', error as Error, { userId });
      throw error;
    }
  }
}

export const userService = new UserService();
