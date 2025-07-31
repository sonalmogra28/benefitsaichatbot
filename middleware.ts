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

  // Skip middleware for API routes, static files, and auth handlers
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/handler/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if user is authenticated with Stack Auth
  const user = await stackServerApp.getUser();

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register'];
  const isPublicRoute = publicRoutes.includes(pathname);

  if (!user && !isPublicRoute) {
    const redirectUrl = encodeURIComponent(request.url);
    return NextResponse.redirect(
      new URL(`/login?redirect=${redirectUrl}`, request.url),
    );
  }

  // For authenticated users, check if they need onboarding
  if (user && !isPublicRoute && pathname !== '/onboarding') {
    // Skip the fetch call to prevent loops - let the page handle the check
    const response = NextResponse.next();
    response.headers.set('X-Stack-User-Id', user.id);
    return response;
  }

  // Redirect authenticated users away from auth pages
  if (user && isPublicRoute) {
    // Determine redirect based on user role
    // This will be handled by the onboarding check in the pages
    return NextResponse.redirect(new URL('/', request.url));
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
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*|handler).*)',
  ],
};
