import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';

export async function middleware(request: NextRequest) {
  const session = cookies().get('session')?.value || '';

  // If no session cookie, redirect to login
  if (!session) {
    if (request.nextUrl.pathname.startsWith('/api')) {
      return new NextResponse('Authentication error', { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Verify the session cookie
    const decodedClaims = await adminAuth.verifySessionCookie(session, true);
    const { uid } = decodedClaims;

    // Add user info to the request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', uid);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('Error verifying session cookie in middleware:', error);
    // If verification fails, redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    // Clear the invalid cookie
    response.cookies.delete('session');
    return response;
  }
}

// Middleware matcher configuration
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - /login
     * - /register
     * - /api/auth (authentication routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|login|register|api/auth).*) ',
  ],
};
