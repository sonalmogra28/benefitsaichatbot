import { type NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';

/**
 * GET /api/auth/csrf
 * Generate and return a CSRF token
 */
export async function GET(req: NextRequest) {
  try {
    // Generate a random CSRF token
    const csrfToken = crypto.randomBytes(32).toString('hex');

    const response = NextResponse.json({
      csrfToken
    });

    // Set CSRF token as httpOnly cookie
    response.cookies.set('csrfToken', csrfToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hour
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}