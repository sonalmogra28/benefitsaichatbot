// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

async function verifySession(sessionCookie: string | undefined, request: NextRequest): Promise<boolean> {
  if (!sessionCookie) {
    return false;
  }
  try {
    const response = await fetch(new URL('/api/auth/verify-session', request.url).toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionCookie }),
    });
    const { isValid } = await response.json();
    return isValid;
  } catch (error) {
    console.error('Middleware: Error verifying session.', error);
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('__session');
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register');
  const isApiAuthRoute = request.nextUrl.pathname.startsWith('/api/auth');

  // Allow API auth routes to be accessed without a session
  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  const sessionIsValid = await verifySession(session?.value, request);

  // If the user is on an auth page but has a valid session, redirect them to the home page.
  if (sessionIsValid && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If the user is on a protected page and does not have a valid session, redirect them to the login page.
  if (!sessionIsValid && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // If none of the above, continue to the requested page.
  return NextResponse.next();
}

// Middleware matcher: run on all routes except static assets and image optimization.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
