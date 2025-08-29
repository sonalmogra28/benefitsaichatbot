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
      if (firebaseError.code === 'auth/invalid-id-token') {
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        );
      }
      throw firebaseError;
    }
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
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
