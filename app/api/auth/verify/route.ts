import { type NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

/**
 * POST /api/auth/verify
 * Verify a session cookie using Firebase Admin SDK
 */
export async function POST(req: NextRequest) {
  try {
    const { sessionCookie } = await req.json();

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Session cookie required' },
        { status: 400 }
      );
    }

    try {
      // Verify the session cookie using Firebase Admin SDK
      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
      
      // Session is valid - return user info
      return NextResponse.json({
        valid: true,
        uid: decodedClaims.uid,
        email: decodedClaims.email,
        role: decodedClaims.role || 'employee',
        companyId: decodedClaims.companyId
      });
    } catch (verifyError) {
      // Session is invalid or expired
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify session' },
      { status: 500 }
    );
  }
}