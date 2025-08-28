import { type NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin-sdk';

export async function POST(request: NextRequest) {
  const { sessionCookie } = await request.json();

  if (!sessionCookie) {
    return NextResponse.json({ error: 'No session cookie provided' }, { status: 400 });
  }

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    return NextResponse.json(decodedClaims);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid session cookie' }, { status: 401 });
  }
}
