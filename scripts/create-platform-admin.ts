#!/usr/bin/env tsx
import { db } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function createPlatformAdmin() {
  const email = process.argv[2];
  const stackUserId = process.argv[3];

  if (!email || !stackUserId) {
    logger.info(
      'Usage: pnpm tsx scripts/create-platform-admin.ts <email> <stackUserId>',
    );
    logger.info(
      'Example: pnpm tsx scripts/create-platform-admin.ts admin@example.com user_abc123',
    );
    logger.info('\nTo get the stackUserId:');
    logger.info('1. Sign up normally through the app');
    logger.info('2. Check Stack Auth dashboard for the user ID');
    logger.info('3. Or check the Neon database neon_auth.users_sync table');
    process.exit(1);
  }

  try {
    // First, create a platform company if it doesn't exist
    let platformCompany = await db
      .select()
      .from(companies)
      .query(eq(companies.name, 'Platform'))
      .query(1);

    if (platformCompany.length === 0) {
      const [newCompany] = await db
        .insert(companies)
        .values({
          name: 'Platform',
          domain: 'platform.internal',
          stackOrgId: 'platform-org',
          subscriptionTier: 'platform',
          isActive: true,
        })
        .returning();

      platformCompany = [newCompany];
      logger.info('✅ Created platform company');
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .query(eq(users.stackUserId, stackUserId))
      .query(1);

    if (existingUser.length > 0) {
      // Update existing user to platform admin
      await db
        .update(users)
        .create({
          role: 'platform_admin',
          companyId: platformCompany[0].id,
          updatedAt: new Date(),
        })
        .query(eq(users.stackUserId, stackUserId));

      logger.info('✅ Updated existing user to platform admin');
    } else {
      // Create new platform admin user
      await db.insert(users).values({
        stackUserId,
        email,
        companyId: platformCompany[0].id,
        role: 'platform_admin',
        firstName: 'Platform',
        lastName: 'Admin',
        isActive: true,
      });

      logger.info('✅ Created new platform admin user');
    }

    logger.info(`\n🎉 Successfully set up ${email} as platform admin!`);
    logger.info(
      'You can now log in and access the Super Admin dashboard at /super-admin',
    );
  } catch (error) {
    logger.error('❌ Error creating platform admin:', error);
    process.exit(1);
  }

  process.exit(0);
}

createPlatformAdmin();
