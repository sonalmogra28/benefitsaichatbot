import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';

async function cleanupLegacyUsers() {
  console.log('🧹 Cleaning up legacy users table...\n');
  
  try {
    // Show current state
    const userCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM users
    `);
    
    console.log(`Found ${userCount[0].count} users in legacy table`);
    
    if (Number(userCount[0].count) === 0) {
      console.log('✅ Legacy table is already empty!');
      process.exit(0);
    }
    
    // Show sample users
    const sampleUsers = await db.select().from(users).limit(5);
    console.log('\nSample users in legacy table:');
    sampleUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.name})`);
    });
    
    console.log('\n⚠️  WARNING: This will delete ALL users from the legacy users table.');
    console.log('Neon Auth will handle all user management going forward.');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Delete all users from legacy table
    await db.delete(users);
    
    // Verify cleanup
    const finalCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM users
    `);
    
    console.log(`✅ Deleted all users from legacy table`);
    console.log(`Final count: ${finalCount[0].count}`);
    
    console.log('\n🎉 Cleanup complete!');
    console.log('The application now uses Neon Auth exclusively for user management.');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
  
  process.exit(0);
}

cleanupLegacyUsers().catch(console.error);