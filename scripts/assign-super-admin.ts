import { auth } from '@/lib/firebase/admin';

async function assignSuperAdmin(email: string) {
  try {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { role: 'super_admin' });
    console.log(`Successfully assigned super_admin role to ${email}`);
  } catch (error) {
    console.error(`Error assigning super_admin role to ${email}:`, error);
  }
}

const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address as an argument.');
  process.exit(1);
}

assignSuperAdmin(email);
