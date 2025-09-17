import { type NextRequest, NextResponse } from 'next/server';
import { protectSuperAdminEndpoint } from '@/lib/middleware/auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logging/logger';
import { getRepositories } from '@/lib/azure/cosmos';
import { z } from 'zod';

const assignRoleSchema = z.object({
  role: z.enum(['user', 'company-admin', 'platform-admin', 'super-admin']),
  companyId: z.string().min(1, 'Company ID is required'),
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { id: userId } = await params;
  
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.admin(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate and authorize (super admin only)
    const { user, error } = await protectSuperAdminEndpoint(request);
    if (error || !user) {
      return error!;
    }

    const body = await request.json();
    const { role, companyId } = assignRoleSchema.parse(body);

    logger.info('API Request: POST /api/admin/users/[id]/assign-role', {
      adminUserId: user.id,
      targetUserId: userId,
      role,
      companyId
    });

    // Get repositories
    const repositories = await getRepositories();
    
    // Get the target user
    const targetUser = await repositories.users.getById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user role and company
    const updatedUser = {
      ...targetUser,
      roles: [role],
      companyId,
      updatedAt: new Date().toISOString(),
      updatedBy: user.id
    };

    await repositories.users.update(userId, updatedUser);

    const duration = Date.now() - startTime;
    
    logger.apiResponse('POST', '/api/admin/users/[id]/assign-role', 200, duration, {
      adminUserId: user.id,
      targetUserId: userId,
      role,
      companyId
    });

    return NextResponse.json({
      success: true,
      message: 'User role assigned successfully',
      data: {
        userId,
        role,
        companyId,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid data format', 
          details: error.errors 
        },
        { status: 400 }
      );
    }
    
    logger.error('Role assignment error', {
      path: request.nextUrl.pathname,
      method: request.method,
      userId,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to assign role' 
      },
      { status: 500 }
    );
  }
}