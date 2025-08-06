import { type NextRequest, NextResponse } from 'next/server';
import { withPlatformAdmin } from '@/lib/auth/api-middleware';
import { SuperAdminService } from '@/lib/services/super-admin.service';

const superAdminService = new SuperAdminService();

// GET /api/super-admin/analytics - Get system-wide analytics
export const GET = withPlatformAdmin(async (request: NextRequest) => {
  try {
    const analytics = await superAdminService.getSystemAnalytics();
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
});