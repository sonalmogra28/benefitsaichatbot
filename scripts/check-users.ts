import { db } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function checkUsers() {
  console.log('Checking users in database...\n');
  
  // Find user by email
  const email = 'spencersteliga1@gmail.com';
  const existingUsers = await db
    .select({
      user: users,
      company: companies,
    })
    .from(users)
    .leftJoin(companies, eq(users.companyId, companies.id))
    .where(eq(users.email, email));
    
  if (existingUsers.length > 0) {
    console.log(`Found ${existingUsers.length} user(s) with email: ${email}\n`);
    existingUsers.forEach((record, index) => {
      console.log(`User ${index + 1}:`);
      console.log('- ID:', record.user.id);
      console.log('- Stack User ID:', record.user.stackUserId);
      console.log('- Email:', record.user.email);
      console.log('- Name:', record.user.firstName, record.user.lastName);
      console.log('- Role:', record.user.role);
      console.log('- Company:', record.company?.name || 'No company');
      console.log('- Active:', record.user.isActive);
      console.log('---');
    });
  } else {
    console.log(`No users found with email: ${email}`);
  }
  
  process.exit(0);
}

checkUsers().catch(console.error);