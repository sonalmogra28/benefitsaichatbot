import { type NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { normalizeLegacyRole, USER_ROLES } from '@/lib/constants/roles';

/**
 * POST /api/auth/verify-token
 * Verifies a Firebase ID token and returns normalized user information.
 */
export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json({ error: 'ID token required' }, { status: 400 });
    }

    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      const role =
        normalizeLegacyRole(
          decoded.role ||
            decoded.custom_claims?.role ||
            decoded.customClaims?.role,
        ) || USER_ROLES.EMPLOYEE;

      return NextResponse.json({
        uid: decoded.uid,
        email: decoded.email,
        role,
        companyId: decoded.companyId || decoded.custom_claims?.companyId,
      });
    } catch (verifyError) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 },
      );
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 },
    );
  }
}
