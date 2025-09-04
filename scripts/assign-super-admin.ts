import { adminAuth } from '@/lib/firebase/admin';

async function assignSuperAdmin(email: string) {
  try {
    const user = await adminAuth.getUserByEmail(email);
    await adminAuth.setCustomUserClaims(user.uid, { super_admin: true });
    console.log(`Successfully assigned super_admin role to ${email}`);
  } catch (error) {
    console.error(`Error assigning super_admin role to ${email}:`, error);
    process.exit(1);
  }
}

// Find the email address from the command-line arguments
const email = process.argv.find((arg) => arg.includes('@'));

if (!email) {
  console.error('Please provide a valid email address as an argument.');
  console.error('Arguments received:', process.argv);
  process.exit(1);
}

assignSuperAdmin(email);
