import { stackServerApp } from '@/stack';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

/**
 * Stack Auth handler for Next.js 15 App Router
 * Processes Stack Auth routes and returns proper Response objects
 */
async function handleStackAuth(
  request: NextRequest,
  { params }: { params: Promise<{ stack: string[] }> }
): Promise<Response> {
  try {
    // Resolve the params promise as required by Next.js 15
    const resolvedParams = await params;
    const stackPath = resolvedParams.stack;
    const fullPath = stackPath.join('/');
    
    // Get the URL and method for processing
    const url = new URL(request.url);
    const method = request.method;
    
    console.log(`Stack Auth: Processing ${method} ${fullPath}`);
    
    // Handle different Stack Auth routes
    switch (fullPath) {
      case 'sign-in':
      case 'handler/sign-in':
        // Stack Auth sign-in should redirect to our login page
        return NextResponse.redirect(new URL('/login', request.url));
        
      case 'sign-up':
      case 'handler/sign-up':
        // Stack Auth sign-up should redirect to our register page
        return NextResponse.redirect(new URL('/register', request.url));
        
      case 'sign-out':
      case 'handler/sign-out': {
        // Handle sign out by clearing cookies and redirecting
        const response = NextResponse.redirect(new URL('/', request.url));
        // Clear Stack Auth cookies
        response.cookies.delete('stack-refresh');
        response.cookies.delete('stack-access');
        response.cookies.delete('stack-access-token');
        response.cookies.delete('stack-refresh-token');
        return response;
      }
        
      case 'oauth/callback':
      case 'handler/oauth/callback':
        // OAuth callback handling - process the callback and redirect
        // For now, redirect to home page after OAuth
        // In production, this would validate the OAuth response
        return NextResponse.redirect(new URL('/', request.url));
        
      case 'api/v1/auth/sessions/current':
        // Return current session info
        try {
          const user = await stackServerApp.getUser();
          if (user) {
            return NextResponse.json({ 
              user: {
                id: user.id,
                email: user.primaryEmail,
                emailVerified: user.primaryEmailVerified,
                displayName: user.displayName,
              }
            });
          }
          return NextResponse.json({ user: null }, { status: 401 });
        } catch (error) {
          return NextResponse.json({ user: null }, { status: 401 });
        }
        
      default:
        // For unhandled Stack routes, return 404
        console.warn(`Unhandled Stack Auth route: ${fullPath}`);
        return new NextResponse(
          JSON.stringify({ 
            error: 'Stack Auth route not found',
            path: fullPath,
            method: method
          }), 
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          }
        );
    }
  } catch (error) {
    console.error('Stack Auth handler error:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }), 
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Export all HTTP methods
export const GET = handleStackAuth;
export const POST = handleStackAuth;
export const PUT = handleStackAuth;
export const PATCH = handleStackAuth;
export const DELETE = handleStackAuth;