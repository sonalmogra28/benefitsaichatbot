import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionCookie = req.cookies.get('session')?.value;

  const publicPaths = [
    '/login',
    '/register',
    '/reset-password',
  ];

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));
  const isStaticFile = pathname.includes('.'); // Simple check for static files (e.g., .png, .css)
  const isApiAuthRoute = pathname.startsWith('/api/auth');

  // Allow access to public paths, static files, and API auth routes without checking session
  if (isPublicPath || isStaticFile || isApiAuthRoute) {
    return NextResponse.next();
  }

  // If no session cookie, redirect to login for protected routes
  if (!sessionCookie) {
    // For API routes, return a 401 error
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // For page routes, redirect to login
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If a session cookie exists, allow the request to proceed.
  // Detailed role-based authorization for paths like /admin, /super-admin
  // must be handled within the respective API routes or server components,
  // where firebase-admin can be safely used in a Node.js runtime.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)', // Match all paths except static assets
  ],
};
