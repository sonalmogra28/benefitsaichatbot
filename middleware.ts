import { NextResponse, type NextRequest } from 'next/server';
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

  // Allow Stack Auth handler routes
  if (pathname.startsWith('/handler')) {
    return NextResponse.next();
  }

  // Check if user is authenticated with Stack Auth
  const user = await stackServerApp.getUser();

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/api/auth/guest', '/api/onboarding', '/api/user/check'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  if (!user && !isPublicRoute) {
    const redirectUrl = encodeURIComponent(request.url);
    return NextResponse.redirect(
      new URL(`/login?redirect=${redirectUrl}`, request.url),
    );
  }

  // Special handling for onboarding flow
  if (user && pathname !== '/onboarding' && pathname !== '/api/user/check' && pathname !== '/api/onboarding') {
    // Check if user exists in our database
    try {
      const response = await fetch(new URL('/api/user/check', request.url), {
        headers: { 'X-Stack-User-Id': user.id }
      });
      
      if (response.status === 404) {
        // User doesn't exist in our DB, needs onboarding
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && ['/login', '/register'].includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/chat/:id',
    '/api/:path*',
    '/login',
    '/register',

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
