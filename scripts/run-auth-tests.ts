import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { auth } from '@/app/(auth)/stack-auth';

console.log('🧪 Running authentication tests...\n');

async function testAuth() {
  let passed = 0;
  let failed = 0;
  
  // Test 1: Check Neon Auth is configured
  console.log('Test 1: Neon Auth Configuration');
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM information_schema.schemata 
      WHERE schema_name = 'neon_auth'
    `);
    
    if (result[0].count > 0) {
      console.log('✅ Neon Auth schema exists');
      passed++;
    } else {
      console.log('❌ Neon Auth schema not found');
      failed++;
    }
  } catch (error) {
    console.log('❌ Error checking Neon Auth:', error);
    failed++;
  }
  
  // Test 2: Check users_sync table
  console.log('\nTest 2: Users Sync Table');
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count FROM neon_auth.users_sync
    `);
    
    console.log(`✅ Users sync table accessible (${result[0].count} users)`);
    passed++;
  } catch (error) {
    console.log('❌ Error accessing users_sync:', error);
    failed++;
  }
  
  // Test 3: No duplicates
  console.log('\nTest 3: No Duplicate Emails');
  try {
    const result = await db.execute(sql`
      SELECT email, COUNT(*) as count
      FROM neon_auth.users_sync
      GROUP BY email
      HAVING COUNT(*) > 1
    `);
    
    if (result.length === 0) {
      console.log('✅ No duplicate emails found');
      passed++;
    } else {
      console.log(`❌ Found ${result.length} duplicate emails`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Error checking duplicates:', error);
    failed++;
  }
  
  // Test 4: Legacy table is empty
  console.log('\nTest 4: Legacy Users Table');
  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count FROM users
    `);
    
    if (Number(result[0].count) === 0) {
      console.log('✅ Legacy users table is empty');
      passed++;
    } else {
      console.log(`❌ Legacy table has ${result[0].count} users`);
      failed++;
    }
  } catch (error) {
    console.log('❌ Error checking legacy table:', error);
    failed++;
  }
  
  // Test 5: Auth function works
  console.log('\nTest 5: Auth Function');
  try {
    // This will fail without a real Stack Auth session, but we can check it doesn't crash
    const session = await auth();
    console.log('✅ Auth function executes without error');
    passed++;
  } catch (error) {
    console.log('❌ Auth function error:', error);
    failed++;
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log('\n⚠️  Some tests failed');
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

testAuth().catch(console.error);