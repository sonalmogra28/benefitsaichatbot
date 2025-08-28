import { NextRequest, NextResponse } from 'next/server';
import { auth } from './lib/firebase/admin';

async function verifySessionCookie(sessionCookie: string) {
  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    return decodedClaims;
  } catch (error) {
    return null;
  }
}

function getRole(decodedClaims: any) {
  if (decodedClaims.super_admin) return 'super_admin';
  if (decodedClaims.platform_admin) return 'platform_admin';
  if (decodedClaims.company_admin) return 'company_admin';
  if (decodedClaims.hr_admin) return 'hr_admin';
  return 'employee';
}

function hasAccess(role: string, path: string) {
  if (path.startsWith('/super-admin')) {
    return role === 'super_admin';
  }
  if (path.startsWith('/admin')) {
    return ['super_admin', 'platform_admin'].includes(role);
  }
  if (path.startsWith('/company-admin')) {
    return ['super_admin', 'platform_admin', 'company_admin'].includes(role);
  }
  return true; // All roles have access to other paths
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie = req.cookies.get('session')?.value;

  const publicPaths = [
    '/login',
    '/register',
    '/reset-password',
  ];

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  const isStaticFile = pathname.includes('.');
  const isApiAuthRoute = pathname.startsWith('/api/auth');

  if (isPublicPath || isStaticFile || isApiAuthRoute) {
    return NextResponse.next();
  }

  if (!sessionCookie) {
    if (!pathname.startsWith('/api')) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const decodedClaims = await verifySessionCookie(sessionCookie);

  if (!decodedClaims) {
    if (!pathname.startsWith('/api')) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  const role = getRole(decodedClaims);
  const userHasAccess = hasAccess(role, pathname);

  if (!userHasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
