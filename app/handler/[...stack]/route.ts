import { NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "@/stack";

// Minimal Stack Auth handler for Next.js 15
// This bypasses the complex StackHandler and directly handles auth routes

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ stack: string[] }> }
) {
  try {
    const params = await props.params;
    const path = params.stack.join('/');
    
    // Handle Stack Auth routes directly
    if (path === 'sign-in' || path === 'login') {
      // Redirect to our login page
      return NextResponse.redirect(new URL('/login', request.url));
    }
    
    if (path === 'sign-up' || path === 'register') {
      // Redirect to our register page
      return NextResponse.redirect(new URL('/register', request.url));
    }
    
    if (path === 'sign-out' || path === 'logout') {
      // Clear auth cookies and redirect
      const response = NextResponse.redirect(new URL('/', request.url));
      // Stack uses these cookie names
      response.cookies.delete('stack-refresh');
      response.cookies.delete('stack-access');
      return response;
    }
    
    // For all other Stack routes, return a simple JSON response
    // This prevents the "no response" error
    return NextResponse.json({ 
      error: 'Stack Auth endpoint not implemented',
      path: path,
      method: 'GET'
    }, { status: 404 });
    
  } catch (error) {
    console.error('Stack Auth handler error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ stack: string[] }> }
) {
  try {
    const params = await props.params;
    const path = params.stack.join('/');
    
    // For POST requests, we need to handle OAuth callbacks and form submissions
    // For now, return a response to prevent the runtime error
    return NextResponse.json({ 
      error: 'Stack Auth POST endpoint not implemented',
      path: path,
      method: 'POST'
    }, { status: 404 });
    
  } catch (error) {
    console.error('Stack Auth handler error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}