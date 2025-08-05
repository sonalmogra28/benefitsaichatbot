import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function deleteUser() {
  const email = process.argv[2] || 'spencer@prettygood.work';
  
  console.log(`🗑️  Deleting all users with email: ${email}`);
  
  const result = await db.delete(users).where(eq(users.email, email));
  
  console.log('✅ Users deleted successfully');
  console.log('You can now create a new account with this email.');
  
  // Show remaining users
  const remainingUsers = await db.select().from(users);
  console.log(`\nRemaining users in database: ${remainingUsers.length}`);
  
  process.exit(0);
}

deleteUser().catch(console.error);