import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function cleanupDuplicates() {
  console.log('🧹 Cleaning up duplicate users in Neon Auth...\n');
  
  try {
    // First, show current duplicates
    console.log('Current duplicate emails:');
    const duplicates = await db.execute(sql`
      SELECT email, COUNT(*) as count
      FROM neon_auth.users_sync
      GROUP BY email
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!');
      process.exit(0);
    }
    
    duplicates.forEach((dup: any) => {
      console.log(`  - ${dup.email}: ${dup.count} entries`);
    });
    
    console.log('\n⚠️  WARNING: This will delete older duplicate entries, keeping only the most recent.');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // For each duplicate email, keep only the most recent
    for (const dup of duplicates) {
      const email = dup.email;
      console.log(`\nProcessing ${email}...`);
      
      // Get all entries for this email
      const entries = await db.execute(sql`
        SELECT id, created_at
        FROM neon_auth.users_sync
        WHERE email = ${email}
        ORDER BY created_at DESC
      `);
      
      if (entries.length > 1) {
        // Keep the first (most recent), delete the rest
        const toKeep = entries[0].id;
        const toDelete = entries.slice(1).map(e => e.id);
        
        console.log(`  Keeping: ${toKeep} (created ${new Date(entries[0].created_at).toLocaleString()})`);
        console.log(`  Deleting ${toDelete.length} older entries`);
        
        // Delete the older duplicates
        for (const id of toDelete) {
          await db.execute(sql`
            DELETE FROM neon_auth.users_sync
            WHERE id = ${id}
          `);
        }
        
        console.log(`  ✅ Cleaned up ${email}`);
      }
    }
    
    // Verify cleanup
    console.log('\n🔍 Verifying cleanup...');
    const remainingDuplicates = await db.execute(sql`
      SELECT email, COUNT(*) as count
      FROM neon_auth.users_sync
      GROUP BY email
      HAVING COUNT(*) > 1
    `);
    
    if (remainingDuplicates.length === 0) {
      console.log('✅ All duplicates have been cleaned up!');
      
      // Show final user count
      const userCount = await db.execute(sql`
        SELECT COUNT(*) as count FROM neon_auth.users_sync
      `);
      console.log(`\n📊 Total users after cleanup: ${userCount[0].count}`);
    } else {
      console.log('⚠️  Some duplicates remain:');
      remainingDuplicates.forEach((dup: any) => {
        console.log(`  - ${dup.email}: ${dup.count} entries`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
  
  process.exit(0);
}

cleanupDuplicates().catch(console.error);