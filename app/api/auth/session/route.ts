import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/firebase/admin';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 5, // 5 days
  path: '/'
};

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token required' },
        { status: 400 }
      );
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000;

    try {
      const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

      const response = NextResponse.json(
        { status: 'success' },
        { status: 200 }
      );

      response.cookies.set('session', sessionCookie, COOKIE_OPTIONS);

      return response;
    } catch (firebaseError: any) {
      console.error('Firebase Admin SDK session cookie creation error:', firebaseError);
      if (firebaseError.code === 'auth/invalid-id-token') {
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        );
      }
      // Re-throw if it's not a known Firebase error to be caught by the outer catch block
      throw firebaseError;
    }
  } catch (error) {
    console.error('Session creation request handler error:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create session' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const response = NextResponse.json(
    { status: 'success' },
    { status: 200 }
  );

  response.cookies.delete('session');

  return response;
}
