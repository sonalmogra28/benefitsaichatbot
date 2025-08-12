import { NextResponse, type NextRequest } from 'next/server';
import { logAccess } from './lib/utils/audit';
import { auth } from './app/(auth)/stack-auth';
import { rateLimit, applyRateLimitHeaders } from './lib/rate-limit';
import { setTenantContext } from './lib/auth/api-middleware';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    // Get user session for authenticated rate limiting
    let userId: string | undefined;
    try {
      const session = await auth();
      userId = session?.user?.id;
    } catch {
      // Continue without user ID
    }
    
    const rateLimitResult = await rateLimit(request, userId);
    
    // If rate limit returns a response, it means the limit was exceeded
    if (rateLimitResult instanceof NextResponse) {
      return rateLimitResult;
    }
    
    // Continue with the request but add rate limit headers
    const response = NextResponse.next();
    if (rateLimitResult && 'remaining' in rateLimitResult) {
      const config = { max: 60, windowMs: 60000 }; // Default, should match config
      applyRateLimitHeaders(response, rateLimitResult, config.max);
    }
    
    return response;
  }
  
  // Skip middleware for static files and auth pages/handlers
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/handler/') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/onboarding') ||
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
      const session = await auth();
      const user = session?.user;
      if (!user) {
        // Redirect to login if not authenticated
        return NextResponse.redirect(new URL('/login', request.url));
      }
      
      // Set tenant context for RLS
      await setTenantContext(request);
      
      // Audit access: map user type to role
      let role: 'user' | 'admin' | 'super-admin';
      if (user.type === 'company_admin' || user.type === 'hr_admin') {
        role = 'admin';
      } else if (user.type === 'platform_admin') {
        role = 'super-admin';
      } else {
        role = 'user';
      }
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
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)',
  ],
};
