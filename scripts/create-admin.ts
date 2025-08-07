#!/usr/bin/env tsx

import { db } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logAdminAction } from '@/lib/auth/audit';
import type { UserRole } from '@/lib/db/types';

// Parse command line arguments
const args = process.argv.slice(2);
const email = args.find(arg => arg.startsWith('--email='))?.split('=')[1];
const role = args.find(arg => arg.startsWith('--role='))?.split('=')[1] as UserRole;
const companyId = args.find(arg => arg.startsWith('--company-id='))?.split('=')[1];

async function createAdmin() {
  console.log('🔧 Creating admin user...\n');

  // Validate inputs
  if (!email) {
    console.error('❌ Email is required. Use --email=user@example.com');
    process.exit(1);
  }

  if (!role || !['hr_admin', 'company_admin', 'platform_admin'].includes(role)) {
    console.error('❌ Valid role is required. Use --role=hr_admin|company_admin|platform_admin');
    process.exit(1);
  }

  if (role !== 'platform_admin' && !companyId) {
    console.error('❌ Company ID is required for non-platform admins. Use --company-id=uuid');
    process.exit(1);
  }

  try {
    // Check if user exists
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUsers.length === 0) {
      console.error('❌ User not found. User must exist in Stack Auth first.');
      console.log('💡 Have the user sign up at /register first, then run this script.');
      process.exit(1);
    }

    const user = existingUsers[0];

    // Validate company if needed
    if (companyId && role !== 'platform_admin') {
      const companyExists = await db
        .select({ id: companies.id, name: companies.name })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);

      if (companyExists.length === 0) {
        console.error('❌ Company not found with ID:', companyId);
        process.exit(1);
      }

      console.log(`✅ Found company: ${companyExists[0].name}`);
    }

    // Update user role
    const previousRole = user.role;
    
    await db
      .update(users)
      .set({
        role,
        companyId: role === 'platform_admin' ? user.companyId : companyId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Log the action
    await logAdminAction(
      'system', // System action
      user.companyId,
      'promote_user',
      'user',
      user.id,
      {
        email,
        previousRole,
        newRole: role,
        executedBy: 'create-admin-script',
        timestamp: new Date().toISOString(),
      }
    );

    console.log('\n✅ Admin user created successfully!\n');
    console.log('📋 User Details:');
    console.log(`   Email: ${email}`);
    console.log(`   Role: ${role}`);
    console.log(`   User ID: ${user.id}`);
    if (companyId) {
      console.log(`   Company ID: ${companyId}`);
    }
    console.log('\n🔐 The user can now access:');
    
    switch (role) {
      case 'hr_admin':
        console.log('   - Company Admin Portal: /company-admin');
        console.log('   - Employee management');
        console.log('   - Document uploads');
        console.log('   - Basic analytics');
        break;
      case 'company_admin':
        console.log('   - Company Admin Portal: /company-admin (full access)');
        console.log('   - All HR admin features');
        console.log('   - Billing management');
        console.log('   - Advanced analytics');
        console.log('   - Company settings');
        break;
      case 'platform_admin':
        console.log('   - Super Admin Portal: /super-admin');
        console.log('   - Company Admin Portal: /company-admin');
        console.log('   - All system features');
        console.log('   - User management across all companies');
        console.log('   - Platform settings');
        console.log('   - System analytics');
        break;
    }

    console.log('\n✨ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error);
    process.exit(1);
  }
}

// Run the script
createAdmin();