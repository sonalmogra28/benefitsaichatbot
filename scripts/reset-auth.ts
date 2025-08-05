import { db } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function resetAuth() {
  const email = process.argv[2];
  
  if (!email) {
    console.error('❌ Please provide an email: npm run reset-auth your@email.com');
    process.exit(1);
  }
  
  console.log(`🔧 Resetting authentication for: ${email}\n`);
  
  // Delete ALL users with this email
  console.log('1. Deleting all user records with this email...');
  const deleteResult = await db.delete(users).where(eq(users.email, email));
  console.log('   ✅ User records deleted\n');
  
  // Show remaining users
  const remainingUsers = await db.select({
    email: users.email,
    stackUserId: users.stackUserId,
    companyId: users.companyId
  }).from(users);
  
  console.log(`2. Remaining users in database: ${remainingUsers.length}`);
  if (remainingUsers.length < 10) {
    remainingUsers.forEach(u => {
      console.log(`   - ${u.email} (Stack: ${u.stackUserId})`);
    });
  }
  
  // Show companies
  console.log('\n3. Companies in database:');
  const allCompanies = await db.select({
    id: companies.id,
    name: companies.name,
    domain: companies.domain
  }).from(companies);
  
  allCompanies.forEach(c => {
    console.log(`   - ${c.name} (${c.domain})`);
  });
  
  console.log('\n✅ Reset complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Go to your app');
  console.log('2. Click "Sign Up" or "Register"');
  console.log('3. Create a new account with:', email);
  console.log('4. Complete the onboarding form');
  console.log('\nMake sure you are using the correct Stack Auth project in your browser!');
  
  process.exit(0);
}

resetAuth().catch(console.error);