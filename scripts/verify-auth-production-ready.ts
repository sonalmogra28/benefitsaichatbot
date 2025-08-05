import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function verifyAuthProductionReady() {
  console.log('🚀 Verifying authentication is production-ready...\n');
  
  const checks = {
    neonAuthSchema: false,
    usersSyncTable: false,
    noDuplicates: false,
    legacyTableEmpty: false,
    sampleUserCheck: false
  };
  
  try {
    // 1. Check Neon Auth schema
    console.log('1️⃣  Checking Neon Auth schema...');
    const schemaResult = await db.execute(sql`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'neon_auth'
    `);
    
    if (schemaResult && schemaResult.length > 0) {
      console.log('   ✅ neon_auth schema exists');
      checks.neonAuthSchema = true;
    } else {
      console.log('   ❌ neon_auth schema NOT found');
    }
    
    // 2. Check users_sync table
    console.log('\n2️⃣  Checking users_sync table...');
    const tableResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'neon_auth' 
      AND table_name = 'users_sync'
    `);
    
    if (tableResult && tableResult.length > 0) {
      const userCount = await db.execute(sql`
        SELECT COUNT(*) as count FROM neon_auth.users_sync
      `);
      console.log(`   ✅ neon_auth.users_sync table exists with ${userCount[0].count} users`);
      checks.usersSyncTable = true;
    } else {
      console.log('   ❌ neon_auth.users_sync table NOT found');
    }
    
    // 3. Check for duplicates
    console.log('\n3️⃣  Checking for duplicate emails...');
    const duplicates = await db.execute(sql`
      SELECT email, COUNT(*) as count
      FROM neon_auth.users_sync
      GROUP BY email
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.length === 0) {
      console.log('   ✅ No duplicate emails found');
      checks.noDuplicates = true;
    } else {
      console.log(`   ❌ Found ${duplicates.length} duplicate emails`);
    }
    
    // 4. Check legacy table
    console.log('\n4️⃣  Checking legacy users table...');
    const legacyCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM users
    `);
    
    if (Number(legacyCount[0].count) === 0) {
      console.log('   ✅ Legacy users table is empty');
      checks.legacyTableEmpty = true;
    } else {
      console.log(`   ❌ Legacy users table has ${legacyCount[0].count} users`);
    }
    
    // 5. Test user query (similar to auth function)
    console.log('\n5️⃣  Testing user query (simulating auth flow)...');
    try {
      const testUser = await db.execute(sql`
        SELECT id, name, email, created_at, raw_json
        FROM neon_auth.users_sync
        LIMIT 1
      `);
      
      if (testUser && testUser.length > 0) {
        console.log('   ✅ Can successfully query users from neon_auth.users_sync');
        checks.sampleUserCheck = true;
      } else {
        console.log('   ⚠️  No users found to test with');
        checks.sampleUserCheck = true; // Still pass if table is empty but queryable
      }
    } catch (error) {
      console.log('   ❌ Error querying users:', error);
    }
    
    // Summary
    console.log('\n📊 PRODUCTION READINESS SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const allChecks = Object.values(checks);
    const passedChecks = allChecks.filter(Boolean).length;
    const totalChecks = allChecks.length;
    
    Object.entries(checks).forEach(([check, passed]) => {
      const checkName = check.replace(/([A-Z])/g, ' $1').toLowerCase();
      console.log(`${passed ? '✅' : '❌'} ${checkName}`);
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Score: ${passedChecks}/${totalChecks}`);
    
    if (passedChecks === totalChecks) {
      console.log('\n🎉 AUTHENTICATION IS PRODUCTION READY! 🎉');
      console.log('\nNext steps:');
      console.log('1. Deploy these changes to production');
      console.log('2. Test sign up with a new email address');
      console.log('3. Test sign in with existing user');
      console.log('4. Verify users can access the application immediately');
    } else {
      console.log('\n⚠️  Some checks failed. Please address the issues above.');
    }
    
  } catch (error) {
    console.error('\n❌ Error during verification:', error);
  }
  
  process.exit(0);
}

verifyAuthProductionReady().catch(console.error);