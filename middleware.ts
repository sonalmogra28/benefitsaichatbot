// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';
import { USER_ROLES, hasRoleAccess } from '@/lib/constants/roles';

async function verifySession(
  sessionCookie: string | undefined,
  request: NextRequest,
): Promise<boolean> {
  if (!sessionCookie) {
    return false;
  }
  try {
    const response = await fetch(
      new URL('/api/auth/verify-session', request.url).toString(),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionCookie }),
      },
    );
    const { isValid } = await response.json();
    return isValid;
  } catch (error) {
    console.error('Middleware: Error verifying session.', error);
    return false;
  }
}

async function verifyIdToken(
  idToken: string | undefined,
  request: NextRequest,
) {
  if (!idToken) {
    return null;
  }

  try {
    const response = await fetch(
      new URL('/api/auth/verify-token', request.url).toString(),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      },
    );

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch (error) {
    console.error('Middleware: Error verifying ID token.', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('__session');
  const isAuthPage =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const isApiAuthRoute = request.nextUrl.pathname.startsWith('/api/auth');

  // Allow API auth routes to be accessed without checks
  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  // API routes use ID tokens for auth
  if (isApiRoute) {
    const authHeader = request.headers.get('Authorization');
    const idToken = authHeader?.split('Bearer ')[1];
    const user = await verifyIdToken(idToken, request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Basic role-based restrictions based on path prefixes
    const roleRequirements: Array<{ prefix: string; role: string }> = [
      { prefix: '/api/super-admin', role: USER_ROLES.SUPER_ADMIN },
      { prefix: '/api/admin', role: USER_ROLES.COMPANY_ADMIN },
      { prefix: '/api/company-admin', role: USER_ROLES.COMPANY_ADMIN },
    ];

    const requiredRole = roleRequirements.find((r) =>
      request.nextUrl.pathname.startsWith(r.prefix),
    )?.role;

    if (requiredRole && !hasRoleAccess(user.role, requiredRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    const response = NextResponse.next();
    response.headers.set('x-user-id', user.uid);
    if (user.companyId) {
      response.headers.set('x-company-id', user.companyId);
    }
    response.headers.set('x-user-role', user.role);
    return response;
  }

  // Non-API routes use session cookies
  const sessionIsValid = await verifySession(session?.value, request);

  if (sessionIsValid && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (!sessionIsValid && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

// Middleware matcher: run on all routes except static assets and image optimization.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
