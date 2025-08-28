import { NextRequest, NextResponse } from 'next/server';
import { superAdminService } from '@/lib/services/super-admin.service';
import { auth } from '@/lib/firebase/admin';
import { USER_ROLES } from '@/lib/constants/roles';

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify the token
    try {
      const decodedToken = await auth.verifyIdToken(token);
      
      // Check if user has super admin role
      if (decodedToken.role !== USER_ROLES.SUPER_ADMIN && decodedToken.role !== USER_ROLES.PLATFORM_ADMIN) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Fetch dashboard stats
    const stats = await superAdminService.getDashboardStats();
    
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in super-admin stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}