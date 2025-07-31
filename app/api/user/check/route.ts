import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const stackUserId = request.headers.get('X-Stack-User-Id');
  
  if (!stackUserId) {
    return NextResponse.json({ error: 'No user ID provided' }, { status: 400 });
  }

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.stackUserId, stackUserId))
    .limit(1);

  if (existingUser.length === 0) {
    return NextResponse.json({ exists: false }, { status: 404 });
  }

  return NextResponse.json({ exists: true, user: existingUser[0] });
}