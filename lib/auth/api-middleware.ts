import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '@workos-inc/authkit-nextjs';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/app/(auth)/stack-auth';
import type { Session } from 'next-auth';

type AuthenticatedApiHandler = (
  req: NextRequest,
  session: Session,
) => Promise<NextResponse>;

export function withAuth(handler: AuthenticatedApiHandler) {
  return async (req: NextRequest) => {
    try {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      return handler(req, session as Session);
    } catch (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}

export function withPlatformAdmin(handler: AuthenticatedApiHandler) {
  return withAuth(async (req, session) => {
    if (session.user.type !== 'platform_admin') {
      return NextResponse.json({ error: 'Platform admin access required' }, { status: 403 });
    }
    return handler(req, session);
  });
}

export function withCompanyAdmin(handler: AuthenticatedApiHandler) {
  return withAuth(async (req, session) => {
    if (!['company_admin', 'hr_admin', 'platform_admin'].includes(session.user.type)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    if (session.user.type !== 'platform_admin' && !session.user.companyId) {
        return NextResponse.json({ error: 'Company association required' }, { status: 403 });
    }
    return handler(req, session);
  });
}

export async function setTenantContext(req: NextRequest) {
  const token = await getToken({ req });

  if (token?.user?.id) {
    const [user] = await db
      .select({ companyId: users.companyId })
      .from(users)
      .where(eq(users.stackUserId, token.user.id));

    if (user?.companyId) {
      await db.execute(`SET rls.company_id = '${user.companyId}'`);
    }
  }

  return NextResponse.next();
}
