import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function testAuthFlow() {
  console.log('🔍 Testing authentication flow with Neon Auth...\n');
  
  try {
    // 1. Check Neon Auth setup
    console.log('1️⃣  Checking Neon Auth configuration:');
    const schemaResult = await db.execute(sql`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'neon_auth'
    `);
    
    if (!schemaResult || schemaResult.length === 0) {
      console.log('❌ CRITICAL: neon_auth schema NOT FOUND!');
      console.log('Neon Auth is not configured on this database.');
      process.exit(1);
    }
    
    console.log('✅ neon_auth schema exists');
    
    // 2. Check users_sync table
    console.log('\n2️⃣  Checking Neon Auth users_sync table:');
    const tableResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM neon_auth.users_sync
    `);
    
    console.log(`✅ Found ${tableResult[0].count} users in neon_auth.users_sync`);
    
    // 3. Show sample users
    console.log('\n3️⃣  Sample users from Neon Auth:');
    const sampleUsers = await db.execute(sql`
      SELECT id, email, name, created_at, raw_json
      FROM neon_auth.users_sync
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (sampleUsers.length > 0) {
      sampleUsers.forEach((user: any) => {
        const metadata = user.raw_json?.clientMetadata || {};
        console.log(`\n  Email: ${user.email}`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Name: ${user.name || 'Not set'}`);
        console.log(`  Created: ${new Date(user.created_at).toLocaleString()}`);
        console.log(`  UserType: ${metadata.userType || 'employee'}`);
        console.log(`  CompanyId: ${metadata.companyId || 'None'}`);
      });
    } else {
      console.log('  No users found yet');
    }
    
    // 4. Check for duplicate emails
    console.log('\n4️⃣  Checking for duplicate emails:');
    const duplicates = await db.execute(sql`
      SELECT email, COUNT(*) as count
      FROM neon_auth.users_sync
      GROUP BY email
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.length > 0) {
      console.log('⚠️  Found duplicate emails:');
      duplicates.forEach((dup: any) => {
        console.log(`  - ${dup.email}: ${dup.count} entries`);
      });
    } else {
      console.log('✅ No duplicate emails found');
    }
    
    // 5. Check old users table (should be empty or minimal)
    console.log('\n5️⃣  Checking legacy users table:');
    const legacyUsers = await db.execute(sql`
      SELECT COUNT(*) as count FROM users
    `);
    console.log(`  Found ${legacyUsers[0].count} users in legacy 'users' table`);
    
    if (Number(legacyUsers[0].count) > 0) {
      console.log('  ⚠️  Legacy users table still has data - this may cause conflicts');
    }
    
    // 6. Authentication flow summary
    console.log('\n6️⃣  Authentication Flow Summary:');
    console.log('  1. User signs up/in via Stack Auth UI');
    console.log('  2. Neon Auth automatically syncs user to neon_auth.users_sync');
    console.log('  3. Our auth() function queries neon_auth.users_sync');
    console.log('  4. No manual onboarding needed - users are ready immediately');
    
    console.log('\n✅ Authentication system is configured for Neon Auth!');
    console.log('\n🚀 To test in production:');
    console.log('  1. Deploy these changes');
    console.log('  2. Try signing up with a new email');
    console.log('  3. User should be able to access the app immediately');
    
  } catch (error) {
    console.error('\n❌ Error testing auth flow:', error);
    if (error instanceof Error && error.message.includes('neon_auth')) {
      console.error('\n⚠️  It appears Neon Auth is not configured on this database.');
      console.error('You may need to enable Neon Auth in your Neon project settings.');
    }
  }
  
  process.exit(0);
}

testAuthFlow().catch(console.error);