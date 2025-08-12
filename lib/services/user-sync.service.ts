import { db } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { CurrentServerUser } from '@stackframe/stack';

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
   * Sync user data from webhook payload
   */
  async syncUserFromWebhook(
    stackUserId: string, 
    userData: any
  ): Promise<void> {
    try {
      // Extract metadata from webhook data
      const metadata = (userData.clientMetadata || {}) as UserMetadata;

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
          metadata.companyId = undefined;
        }
      }

    } catch (error) {
      console.error(`Failed to sync user ${stackUserId}:`, error);
      throw error;
    }
  }

  /**
   * Update Stack Auth user metadata for current user
   */
  async updateCurrentUserMetadata(
    stackUser: CurrentServerUser,
    metadata: UserMetadata
  ): Promise<void> {
    try {
      // Only update if metadata has changed
      const currentMetadata = (stackUser.clientMetadata || {}) as UserMetadata;
      
      const hasChanges = Object.keys(metadata).some(
        key => currentMetadata[key as keyof UserMetadata] !== metadata[key as keyof UserMetadata]
      );

      if (hasChanges) {
        // Note: update method might not be available on server user
        // This would need to be done client-side or via API
      }
    } catch (error) {
      console.error('Failed to update Stack user metadata:', error);
      throw error;
    }
  }

  /**
   * Sync current user to database
   */
  async syncCurrentUserToDb(
    stackUser: CurrentServerUser
  ): Promise<void> {
    try {
      const metadata = (stackUser.clientMetadata || {}) as UserMetadata;
      
      // Update or create user in database
      await db.execute(sql`
        INSERT INTO users (
          id, 
          stack_user_id, 
          email, 
          name,
          company_id,
          department,
          role,
          created_at,
          updated_at
        ) VALUES (
          ${stackUser.id},
          ${stackUser.id},
          ${stackUser.primaryEmail || ''},
          ${stackUser.displayName || stackUser.primaryEmail || ''},
          ${metadata.companyId || null},
          ${metadata.department || null},
          ${metadata.userType || 'employee'},
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
        ON CONFLICT (stack_user_id) DO UPDATE SET
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          company_id = EXCLUDED.company_id,
          department = EXCLUDED.department,
          role = EXCLUDED.role,
          updated_at = CURRENT_TIMESTAMP
      `);

    } catch (error) {
      console.error(`Failed to sync user to database:`, error);
      throw error;
    }
  }

  /**
   * Handle user profile updates from Stack Auth webhook
   */
  async handleUserUpdate(stackUserId: string, updates: any): Promise<void> {
    try {
      // Update user data from webhook
      await this.syncUserFromWebhook(stackUserId, updates);

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
  
  /**
   * Get user metadata to update (for client-side update)
   */
  async prepareUserMetadata(userId: string): Promise<UserMetadata> {
    const dbUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!dbUser || dbUser.length === 0) {
      throw new Error(`User ${userId} not found in database`);
    }

    const user = dbUser[0];

    return {
      companyId: user.companyId || undefined,
      department: user.department || undefined,
      hireDate: user.hireDate || undefined,
      userType: user.role as UserMetadata['userType'],
    };
  }
}

// Export singleton instance
export const userSyncService = new UserSyncService();