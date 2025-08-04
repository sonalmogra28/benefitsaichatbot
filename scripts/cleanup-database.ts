import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Database cleanup script to resolve authentication issues
 * This script identifies and fixes common data integrity problems
 */

export async function cleanupDatabaseInconsistencies() {
  console.log('🔧 Starting database cleanup...');

  try {
    // 1. Find duplicate users by email
    console.log('📋 Checking for duplicate users by email...');
    const allUsers = await db.select().from(users);
    const emailGroups = allUsers.reduce(
      (groups, user) => {
        if (!groups[user.email]) {
          groups[user.email] = [];
        }
        groups[user.email].push(user);
        return groups;
      },
      {} as Record<string, typeof allUsers>,
    );

    const duplicates = Object.entries(emailGroups).filter(
      ([_, users]) => users.length > 1,
    );

    if (duplicates.length > 0) {
      console.log(
        `⚠️  Found ${duplicates.length} email addresses with multiple users:`,
      );
      for (const [email, userList] of duplicates) {
        console.log(`  - ${email}: ${userList.length} users`);
        for (const user of userList) {
          console.log(
            `    * ID: ${user.id}, Stack ID: ${user.stackUserId}, Company: ${user.companyId}`,
          );
        }
      }
    } else {
      console.log('✅ No duplicate emails found');
    }

    // 2. Find users without valid Stack User IDs
    console.log('📋 Checking for users with invalid Stack User IDs...');
    const invalidStackUsers = allUsers.filter(
      (user) => !user.stackUserId || user.stackUserId.startsWith('migrated-'),
    );

    if (invalidStackUsers.length > 0) {
      console.log(
        `⚠️  Found ${invalidStackUsers.length} users with invalid Stack User IDs:`,
      );
      for (const user of invalidStackUsers) {
        console.log(`  - ${user.email}: Stack ID "${user.stackUserId}"`);
      }
    } else {
      console.log('✅ All users have valid Stack User IDs');
    }

    // 3. Find orphaned users (users without companies)
    console.log('📋 Checking for orphaned users...');
    const orphanedUsers = allUsers.filter((user) => !user.companyId);

    if (orphanedUsers.length > 0) {
      console.log(`⚠️  Found ${orphanedUsers.length} orphaned users:`);
      for (const user of orphanedUsers) {
        console.log(`  - ${user.email}: No company ID`);
      }
    } else {
      console.log('✅ All users have company associations');
    }

    console.log('🔧 Database cleanup completed');

    return {
      duplicateEmails: duplicates.length,
      invalidStackUsers: invalidStackUsers.length,
      orphanedUsers: orphanedUsers.length,
      recommendations: generateRecommendations(
        duplicates,
        invalidStackUsers,
        orphanedUsers,
      ),
    };
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    throw error;
  }
}

function generateRecommendations(
  duplicates: any[],
  invalidStackUsers: any[],
  orphanedUsers: any[],
): string[] {
  const recommendations: string[] = [];

  if (duplicates.length > 0) {
    recommendations.push(
      '🔧 DUPLICATE EMAILS: Review and merge or remove duplicate user accounts',
    );
  }

  if (invalidStackUsers.length > 0) {
    recommendations.push(
      '🔧 INVALID STACK IDS: Update users with proper Stack Auth user IDs',
    );
  }

  if (orphanedUsers.length > 0) {
    recommendations.push(
      '🔧 ORPHANED USERS: Assign users to appropriate companies',
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ No issues found - database is clean');
  }

  return recommendations;
}

// Function to remove specific user if needed (for fixing the duplicate key issue)
export async function removeUserByEmailAndCompany(
  email: string,
  companyId: string,
) {
  console.log(`🗑️  Removing user ${email} from company ${companyId}...`);

  const deletedUsers = await db
    .delete(users)
    .where(eq(users.email, email))
    .returning();

  console.log(`✅ Removed ${deletedUsers.length} user(s)`);
  return deletedUsers;
}
