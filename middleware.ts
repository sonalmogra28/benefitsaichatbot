// middleware.ts
import { NextResponse, type NextRequest } from 'next/server';

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

async function attemptRefresh(request: NextRequest): Promise<string[] | null> {
  const refreshToken = request.cookies.get('refresh_token')?.value;
  if (!refreshToken) return null;
  try {
    const refreshResponse = await fetch(
      new URL('/api/auth/refresh', request.url).toString(),
      {
        method: 'POST',
        headers: {
          Cookie: `refresh_token=${refreshToken}`,
        },
      },
    );
    if (!refreshResponse.ok) return null;
    const setCookie = refreshResponse.headers.get('set-cookie');
    return setCookie ? [setCookie] : [];
  } catch (error) {
    console.error('Middleware: Error refreshing session.', error);
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

  let sessionIsValid = await verifySession(session?.value, request);
  let newCookies: string[] | null = null;
  if (!sessionIsValid) {
    newCookies = await attemptRefresh(request);
    if (newCookies !== null) {
      sessionIsValid = true;
    }
  }

  if (sessionIsValid && isAuthPage) {
    const res = NextResponse.redirect(new URL('/', request.url));
    newCookies?.forEach((c) => res.headers.append('Set-Cookie', c));
    return res;
  }

  if (!sessionIsValid && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const res = NextResponse.next();
  newCookies?.forEach((c) => res.headers.append('Set-Cookie', c));
  return res;
}

// Middleware matcher: run on all routes except static assets and image optimization.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
