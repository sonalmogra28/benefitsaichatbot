import { type NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/lib/azure/cosmos-db';
import type { SuperAdminStats } from '@/types/api';

async function verifySuperAdmin(
  request: NextRequest,
): Promise<NextResponse | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    // @ts-ignore
    if (decodedToken.super_admin !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return null;
  } catch (error) {
    console.error('Token verification failed:', error);
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const unauthorizedResponse = await verifySuperAdmin(request);
    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const stats: SuperAdminStats = await superAdminService.getPlatformStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in super-admin stats API:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
