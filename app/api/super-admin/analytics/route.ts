import { type NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin-middleware';
import { SuperAdminService } from '@/lib/services/super-admin.service';

const superAdminService = new SuperAdminService();

// GET /api/super-admin/analytics - Get system-wide analytics
export const GET = requireSuperAdmin(async (request: NextRequest) => {
  try {
    const analytics = await superAdminService.getAnalytics();
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching system analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system analytics' },
      { status: 500 },
    );
  }
});
