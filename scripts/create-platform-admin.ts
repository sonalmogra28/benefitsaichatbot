#!/usr/bin/env tsx
import { db } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function createPlatformAdmin() {
  const email = process.argv[2];
  const stackUserId = process.argv[3];

  if (!email || !stackUserId) {
    console.log(
      'Usage: pnpm tsx scripts/create-platform-admin.ts <email> <stackUserId>',
    );
    console.log(
      'Example: pnpm tsx scripts/create-platform-admin.ts admin@example.com user_abc123',
    );
    console.log('\nTo get the stackUserId:');
    console.log('1. Sign up normally through the app');
    console.log('2. Check Stack Auth dashboard for the user ID');
    console.log('3. Or check the Neon database neon_auth.users_sync table');
    process.exit(1);
  }

  try {
    // First, create a platform company if it doesn't exist
    let platformCompany = await db
      .select()
      .from(companies)
      .where(eq(companies.name, 'Platform'))
      .limit(1);

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
      console.log('✅ Created platform company');
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.stackUserId, stackUserId))
      .limit(1);

    if (existingUser.length > 0) {
      // Update existing user to platform admin
      await db
        .update(users)
        .set({
          role: 'platform_admin',
          companyId: platformCompany[0].id,
          updatedAt: new Date(),
        })
        .where(eq(users.stackUserId, stackUserId));

      console.log('✅ Updated existing user to platform admin');
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

      console.log('✅ Created new platform admin user');
    }

    console.log(`\n🎉 Successfully set up ${email} as platform admin!`);
    console.log(
      'You can now log in and access the Super Admin dashboard at /super-admin',
    );
  } catch (error) {
    console.error('❌ Error creating platform admin:', error);
    process.exit(1);
  }

  process.exit(0);
}

createPlatformAdmin();
