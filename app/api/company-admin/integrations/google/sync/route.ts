import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/admin-middleware';
import { USER_ROLES } from '@/lib/constants/roles';

async function handler() {
  try {
    // TODO: Implement actual Google Workspace sync
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Google Workspace sync failed:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

export const POST = withAuth(USER_ROLES.COMPANY_ADMIN, handler);
