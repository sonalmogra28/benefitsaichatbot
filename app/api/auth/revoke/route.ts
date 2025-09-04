import { NextResponse } from 'next/server';
import { revokeTokensForUser } from '@/lib/auth/refresh-tokens';
import { adminAuth } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 },
      );
    }
    await revokeTokensForUser(userId);
    await adminAuth.revokeRefreshTokens(userId);
    return NextResponse.json({ status: 'revoked' });
  } catch (error) {
    console.error('Revoke tokens error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke tokens' },
      { status: 500 },
    );
  }
}
