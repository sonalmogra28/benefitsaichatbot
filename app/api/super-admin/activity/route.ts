import { type NextRequest, NextResponse } from 'next/server';
import { superAdminService } from '@/lib/services/super-admin.service';
import { adminAuth } from '@/lib/firebase/admin';
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
      const decodedToken = await adminAuth.verifyIdToken(token);
      
      // Check if user has super admin role
      if (decodedToken.role !== USER_ROLES.SUPER_ADMIN && decodedToken.role !== USER_ROLES.PLATFORM_ADMIN) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get limit from query params
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get('limit') || '10', 10);

    // Fetch recent activity
    const activity = await superAdminService.getRecentActivity(limit);
    
    return NextResponse.json(activity);
  } catch (error) {
    console.error('Error in super-admin activity API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}