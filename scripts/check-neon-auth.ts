import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function checkNeonAuth() {
  console.log('🔍 Checking for Neon Auth setup...\n');
  
  try {
    // Check if neon_auth schema exists
    const schemaResult = await db.execute(sql`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'neon_auth'
    `);
    
    console.log('Schema result:', schemaResult);
    
    if (!schemaResult || (Array.isArray(schemaResult) && schemaResult.length === 0)) {
      console.log('❌ neon_auth schema NOT FOUND');
      console.log('This means Neon Auth is not set up on this database.\n');
      console.log('Your app is NOT using Neon Auth - it\'s using regular Stack Auth with manual user management.\n');
    } else {
      console.log('✅ neon_auth schema exists\n');
      
      // Check for users_sync table
      const tableResult = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'neon_auth' 
        AND table_name = 'users_sync'
      `);
      
      if (tableResult && tableResult.length > 0) {
        console.log('✅ neon_auth.users_sync table exists\n');
        
        // Get some users from neon_auth.users_sync
        const neonUsers = await db.execute(sql`
          SELECT id, name, email, created_at 
          FROM neon_auth.users_sync 
          LIMIT 5
        `);
        
        console.log(`Found ${neonUsers.length} users in neon_auth.users_sync:`);
        neonUsers.forEach((user: any) => {
          console.log(`- ${user.email} (${user.name})`);
        });
      } else {
        console.log('❌ neon_auth.users_sync table NOT FOUND');
      }
    }
    
    // Check current users table
    console.log('\n📊 Current users table:');
    const currentUsers = await db.execute(sql`
      SELECT COUNT(*) as count FROM users
    `);
    console.log(`Total users in 'users' table: ${currentUsers[0].count}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkNeonAuth().catch(console.error);