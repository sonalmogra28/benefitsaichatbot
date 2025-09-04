import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import {
  verifyRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from '@/lib/auth/refresh-tokens';

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || '';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Missing refresh token' },
        { status: 401 },
      );
    }

    const record = await verifyRefreshToken(refreshToken);
    if (!record) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 },
      );
    }

    const tokenResponse = await fetch(
      `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      },
    );
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      await revokeRefreshToken(refreshToken);
      return NextResponse.json(
        { error: 'Failed to refresh token' },
        { status: 401 },
      );
    }

    const {
      id_token,
      refresh_token: newRefreshToken,
      user_id,
    } = tokenData as {
      id_token: string;
      refresh_token: string;
      user_id: string;
    };

    const expiresIn = 60 * 60 * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(id_token, {
      expiresIn,
    });

    await rotateRefreshToken(refreshToken, newRefreshToken, user_id);

    const res = NextResponse.json({ status: 'success' });
    res.cookies.set('__session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: expiresIn / 1000,
      path: '/',
      sameSite: 'lax',
    });
    res.cookies.set('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
      sameSite: 'lax',
    });

    return res;
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json(
      { error: 'Refresh token failed' },
      { status: 500 },
    );
  }
}
