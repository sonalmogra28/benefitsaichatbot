import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/auth/admin-middleware';
import { USER_ROLES } from '@/lib/constants/roles';

async function handler() {
  try {
    const { users } = await auth.listUsers();
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}

export const GET = withAuth(USER_ROLES.PLATFORM_ADMIN, handler);
