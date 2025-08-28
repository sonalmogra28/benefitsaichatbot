import { type NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/firebase/services/user.service';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('X-User-Id');
  
  if (!userId) {
    return NextResponse.json({ error: 'No user ID provided' }, { status: 400 });
  }

  const existingUser = await userService.getUserFromFirestore(userId);

  if (!existingUser) {
    return NextResponse.json({ exists: false }, { status: 404 });
  }

  return NextResponse.json({ exists: true, user: existingUser });
}
