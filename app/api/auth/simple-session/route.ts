import { type NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin'; // Corrected import path

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    // Verify the ID token and decode its claims
    const decodedIdToken = await adminAuth.verifyIdToken(idToken);

    // Create the session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: 60 * 60 * 24 * 7 * 1000, // 7 days in milliseconds
    });

    // Create response with session cookie
    const response = NextResponse.json({ success: true });

    // Set the __session cookie
    response.cookies.set('__session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Use secure cookie in production
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      domain:
        process.env.NODE_ENV === 'production'
          ? '.your-production-domain.com'
          : undefined, // Set domain for production
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
