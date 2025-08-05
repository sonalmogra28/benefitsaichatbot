import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function emergencyAuthFix() {
  console.log('🚨 Emergency Auth Fix - Checking database state...\n');
  
  const email = 'spencer@prettygood.work';
  
  // Check if user exists in database
  const existingUsers = await db.select().from(users).where(eq(users.email, email));
  
  if (existingUsers.length > 0) {
    console.log(`Found ${existingUsers.length} user(s) with email ${email}:`);
    existingUsers.forEach(user => {
      console.log(`- ID: ${user.id}`);
      console.log(`  Stack User ID: ${user.stackUserId}`);
      console.log(`  Company ID: ${user.companyId}`);
      console.log(`  Created: ${user.createdAt}`);
      console.log('');
    });
    
    console.log('🔧 To fix this issue:');
    console.log('1. The user exists in the database but Stack Auth may be out of sync');
    console.log('2. Try signing in with the existing account');
    console.log('3. If that fails, we need to delete the database record:');
    console.log(`\n   await db.delete(users).where(eq(users.email, '${email}'));\n`);
    
    // Ask for confirmation before deleting
    console.log('Do you want to DELETE this user from the database? (yes/no)');
    
    const deleteUser = process.argv[2] === 'delete';
    if (deleteUser) {
      console.log('\n🗑️  Deleting user...');
      await db.delete(users).where(eq(users.email, email));
      console.log('✅ User deleted. You can now create a new account.');
    } else {
      console.log('\nTo delete the user, run: npm run fix-auth delete');
    }
  } else {
    console.log(`❌ No user found with email ${email} in the database`);
    console.log('\nThis means the issue might be:');
    console.log('1. Stack Auth has the user but your database doesn\'t');
    console.log('2. The email check is happening at a different level');
    
    // Check all users
    const allUsers = await db.select().from(users);
    console.log(`\nTotal users in database: ${allUsers.length}`);
    if (allUsers.length > 0) {
      console.log('\nExisting users:');
      allUsers.forEach(user => {
        console.log(`- ${user.email} (Stack ID: ${user.stackUserId})`);
      });
    }
  }
  
  process.exit(0);
}

emergencyAuthFix().catch(console.error);