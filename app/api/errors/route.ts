import { type NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const errorData = await req.json();
    
    // Log error to console (in production, send to logging service)
    console.error('[ERROR LOG]:', {
      ...errorData,
      serverTime: new Date().toISOString()
    });
    
    // In production, you would send this to:
    // - Sentry, Rollbar, or similar error tracking service
    // - Firebase Analytics
    // - Custom logging database
    
    return NextResponse.json({ logged: true });
  } catch (error) {
    return NextResponse.json({ logged: false }, { status: 500 });
  }
}