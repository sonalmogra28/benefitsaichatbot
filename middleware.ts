import { NextResponse, type NextRequest } from 'next/server';
import { logAccess } from './lib/utils/audit';
import { stackServerApp } from './stack';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  // Skip middleware for API routes, static files, and auth handlers
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/handler/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Protected routes that require authentication
  const protectedPaths = ['/admin', '/company-admin', '/chat', '/debug/auth'];
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path),
  );

  if (isProtectedPath) {
    try {
      const user = await stackServerApp.getUser();
      if (!user) {
        // Redirect to login if not authenticated
        return NextResponse.redirect(new URL('/login', request.url));
      }
      // Audit access: derive role based on path
      const role: 'user' | 'admin' | 'super-admin' = pathname.startsWith(
        '/company-admin',
      )
        ? 'admin'
        : pathname.startsWith('/admin')
          ? 'super-admin'
          : 'user';
      logAccess(user.id, pathname, role);
    } catch (error) {
      // If there's an error checking auth, redirect to login
      console.error('Auth check error in middleware:', error);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public files with extensions
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)',
  ],
};
