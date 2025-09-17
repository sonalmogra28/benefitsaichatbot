import { NextResponse, type NextRequest } from 'next/server';
import { protectAdminEndpoint } from '@/lib/middleware/auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logging/logger';
import { getRepositories } from '@/lib/azure/cosmos';

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.admin(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate and authorize
    const { user, error } = await protectAdminEndpoint(request);
    if (error || !user) {
      return error!;
    }

    logger.info('API Request: GET /api/admin/users', {
      userId: user.id,
      companyId: user.companyId
    });

    // Get all users from database
    const repositories = await getRepositories();
    const users = await repositories.users.list();

    // Filter users based on admin permissions
    let filteredUsers = users;
    if (!user.roles.includes('super-admin')) {
      // Company admins can only see users from their company
      filteredUsers = users.filter(u => u.companyId === user.companyId);
    }

    // Remove sensitive information
    const safeUsers = filteredUsers.map(u => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      roles: u.roles,
      companyId: u.companyId,
      status: u.status,
      createdAt: u.createdAt,
      lastActive: u.lastActive
    }));

    const duration = Date.now() - startTime;
    
    logger.apiResponse('GET', '/api/admin/users', 200, duration, {
      userId: user.id,
      companyId: user.companyId,
      userCount: safeUsers.length
    });

    return NextResponse.json({
      success: true,
      data: {
        users: safeUsers,
        total: safeUsers.length
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Users list error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to retrieve users' 
      },
      { status: 500 }
    );
  }
}