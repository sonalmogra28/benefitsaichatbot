import { stackServerApp } from "@/stack";
import { NextRequest, NextResponse } from "next/server";

// Stack Auth handler - handles all Stack Auth routes
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  
  // Handle Stack Auth routes
  if (url.pathname.includes('/sign-in')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  if (url.pathname.includes('/sign-up')) {
    return NextResponse.redirect(new URL('/signup', req.url));
  }
  if (url.pathname.includes('/sign-out')) {
    // Clear auth cookies
    const response = NextResponse.redirect(new URL('/', req.url));
    response.cookies.delete('stack-auth');
    return response;
  }
  
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

export async function POST(req: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}