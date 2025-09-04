// app/api/auth/verify-session/route.ts
import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const { sessionCookie } = await request.json();
    if (!sessionCookie) {
      return NextResponse.json({ isValid: false }, { status: 400 });
    }
    await adminAuth.verifySessionCookie(sessionCookie, true);
    return NextResponse.json({ isValid: true });
  } catch (error) {
    return NextResponse.json({ isValid: false }, { status: 401 });
  }
}
