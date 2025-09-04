// app/api/auth/session/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import {
  storeRefreshToken,
  revokeRefreshToken,
} from '@/lib/auth/refresh-tokens';

// The name of the session cookie.
const SESSION_COOKIE_NAME = '__session';

/**
 * POST handler to create a session cookie.
 * Expects an `idToken` in the request body.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken, refreshToken } = body;

    if (!idToken || !refreshToken) {
      return NextResponse.json(
        { error: 'ID and refresh tokens are required' },
        { status: 400 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(idToken);

    // Short-lived session cookie (1 hour)
    const expiresIn = 60 * 60 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    // Persist refresh token and set cookies
    await storeRefreshToken(refreshToken, decoded.uid);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expiresIn / 1000,
      path: '/',
      sameSite: 'lax',
    });

    cookieStore.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create session', details: error.message },
      { status: 401 },
    );
  }
}

/**
 * GET handler to retrieve the current session details.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const { uid, email, role, companyId } = decoded as any;

    return NextResponse.json({ uid, email, role, companyId });
  } catch (error) {
    console.error('Session retrieval error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

/**
 * DELETE handler to clear the session cookie.
 */
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;
    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    cookieStore.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
    });

    cookieStore.set('refresh_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
    });

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error('Session deletion error:', error);
    return NextResponse.json(
      { error: 'Failed to delete session', details: error.message },
      { status: 500 },
    );
  }
}
