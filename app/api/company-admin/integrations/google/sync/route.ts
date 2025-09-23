import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/admin-middleware';
import { USER_ROLES } from '@/lib/constants/roles';
import { logger } from '@/lib/logger';
import { GoogleWorkspaceService } from '@/lib/services/google-workspace.service';

async function handler(request: Request) {
  try {
    const { companyId, accessToken } = await request.json();
    
    if (!companyId || !accessToken) {
      return NextResponse.json(
        { error: 'Company ID and access token are required' },
        { status: 400 }
      );
    }

    const googleWorkspaceService = new GoogleWorkspaceService();
    const syncedCount = await googleWorkspaceService.syncUsers(companyId, accessToken);

    logger.info('Google Workspace sync completed', {
      companyId,
      syncedCount
    });

    return NextResponse.json({ 
      success: true, 
      syncedCount,
      message: `Successfully synced ${syncedCount} users from Google Workspace`
    });
  } catch (error) {
    logger.error('Google Workspace sync failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}

export const POST = withAuth(USER_ROLES.COMPANY_ADMIN, handler);
