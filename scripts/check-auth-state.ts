import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

async function checkAuthState() {
  console.log('🔍 Checking authentication state...\n');
  
  // Get all users from database
  const allUsers = await db.select({
    id: users.id,
    email: users.email,
    stackUserId: users.stackUserId,
    companyId: users.companyId,
    createdAt: users.createdAt
  }).from(users);
  
  console.log(`Total users in database: ${allUsers.length}\n`);
  
  console.log('Recent users (last 10):');
  const recentUsers = allUsers.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 10);
  
  recentUsers.forEach(user => {
    console.log(`- ${user.email}`);
    console.log(`  Stack ID: ${user.stackUserId}`);
    console.log(`  Created: ${new Date(user.createdAt).toLocaleString()}\n`);
  });
  
  process.exit(0);
}

checkAuthState().catch(console.error);