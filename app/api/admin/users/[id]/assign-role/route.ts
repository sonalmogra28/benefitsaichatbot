import { type NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/auth/admin-middleware';
import { USER_ROLES } from '@/lib/constants/roles';

async function handler(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { role, companyId } = await req.json();
  const { id } = params;

  try {
    await adminAuth.setCustomUserClaims(id, { role, companyId });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}

export const POST = withAuth(USER_ROLES.PLATFORM_ADMIN, handler);
