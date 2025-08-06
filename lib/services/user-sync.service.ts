import { db } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { stackServerApp } from '@/stack';
import type { User as StackUser } from '@stackframe/stack';

export interface UserMetadata {
  companyId?: string;
  department?: string;
  hireDate?: string;
  userType?: 'employee' | 'hr_admin' | 'company_admin' | 'platform_admin';
  location?: string;
  benefitsSelections?: Record<string, any>;
}

export class UserSyncService {
  /**
   * Sync a Stack Auth user with our local database
   */
  async syncUser(stackUserId: string): Promise<void> {
    try {
      // Get user from Stack Auth
      const stackUser = await stackServerApp.getUser({ userId: stackUserId });
      if (!stackUser) {
        throw new Error(`Stack user ${stackUserId} not found`);
      }

      // Extract metadata
      const metadata = (stackUser.clientMetadata || {}) as UserMetadata;

      // Check if user exists in Neon Auth sync table
      const neonUser = await db.execute(sql`
        SELECT id, email, raw_json
        FROM neon_auth.users_sync
        WHERE id = ${stackUserId}
        LIMIT 1
      `);

      if (!neonUser || neonUser.length === 0) {
        // User should exist in Neon Auth
        console.warn(`User ${stackUserId} not found in Neon Auth sync table`);
        return;
      }

      // If user has a companyId, verify the company exists
      if (metadata.companyId) {
        const company = await db
          .select()
          .from(companies)
          .where(eq(companies.id, metadata.companyId))
          .limit(1);

        if (!company || company.length === 0) {
          console.error(`Company ${metadata.companyId} not found for user ${stackUserId}`);
          // Remove invalid companyId from metadata
          metadata.companyId = undefined;
        }
      }

      // Update Stack Auth user metadata if needed
      await this.updateStackUserMetadata(stackUser, metadata);

    } catch (error) {
      console.error(`Failed to sync user ${stackUserId}:`, error);
      throw error;
    }
  }

  /**
   * Update Stack Auth user metadata
   */
  async updateStackUserMetadata(
    stackUser: StackUser,
    metadata: UserMetadata
  ): Promise<void> {
    try {
      // Only update if metadata has changed
      const currentMetadata = (stackUser.clientMetadata || {}) as UserMetadata;
      
      const hasChanges = Object.keys(metadata).some(
        key => currentMetadata[key as keyof UserMetadata] !== metadata[key as keyof UserMetadata]
      );

      if (hasChanges) {
        await stackUser.update({
          clientMetadata: {
            ...currentMetadata,
            ...metadata,
          },
        });
      }
    } catch (error) {
      console.error('Failed to update Stack user metadata:', error);
      throw error;
    }
  }

  /**
   * Sync user from our database to Stack Auth
   */
  async syncToStackAuth(userId: string): Promise<void> {
    try {
      // Get user from our database
      const dbUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!dbUser || dbUser.length === 0) {
        throw new Error(`User ${userId} not found in database`);
      }

      const user = dbUser[0];

      // Get Stack Auth user
      const stackUser = await stackServerApp.getUser({ userId: user.stackUserId });
      if (!stackUser) {
        throw new Error(`Stack user ${user.stackUserId} not found`);
      }

      // Prepare metadata
      const metadata: UserMetadata = {
        companyId: user.companyId || undefined,
        department: user.department || undefined,
        hireDate: user.hireDate?.toISOString() || undefined,
        userType: user.role as UserMetadata['userType'],
        location: user.location || undefined,
      };

      // Update Stack Auth user
      await this.updateStackUserMetadata(stackUser, metadata);

    } catch (error) {
      console.error(`Failed to sync user ${userId} to Stack Auth:`, error);
      throw error;
    }
  }

  /**
   * Bulk sync users for a company
   */
  async syncCompanyUsers(companyId: string): Promise<void> {
    try {
      const companyUsers = await db
        .select()
        .from(users)
        .where(eq(users.companyId, companyId));

      console.log(`Syncing ${companyUsers.length} users for company ${companyId}`);

      // Sync each user
      const results = await Promise.allSettled(
        companyUsers.map(user => this.syncToStackAuth(user.id))
      );

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(
            `Failed to sync user ${companyUsers[index].id}:`,
            result.reason
          );
        }
      });

      const successful = results.filter(r => r.status === 'fulfilled').length;
      console.log(`Successfully synced ${successful}/${companyUsers.length} users`);

    } catch (error) {
      console.error(`Failed to sync company ${companyId} users:`, error);
      throw error;
    }
  }

  /**
   * Handle user profile updates from Stack Auth webhook
   */
  async handleUserUpdate(stackUserId: string, updates: any): Promise<void> {
    try {
      // Sync the updated user
      await this.syncUser(stackUserId);

      // If display name was updated, update it in our database
      if (updates.displayName) {
        await db.execute(sql`
          UPDATE users 
          SET name = ${updates.displayName}
          WHERE stack_user_id = ${stackUserId}
        `);
      }

      // If email was updated, update it in our database
      if (updates.primaryEmail) {
        await db.execute(sql`
          UPDATE users 
          SET email = ${updates.primaryEmail}
          WHERE stack_user_id = ${stackUserId}
        `);
      }

    } catch (error) {
      console.error(`Failed to handle user update for ${stackUserId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const userSyncService = new UserSyncService();