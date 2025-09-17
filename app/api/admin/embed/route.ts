import { type NextRequest, NextResponse } from 'next/server';
import { protectAdminEndpoint } from '@/lib/middleware/auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logging/logger';

// GET /api/admin/embed/config - Minimal config for Workday Extend embedding
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

    logger.info('API Request: GET /api/admin/embed/config', {
      userId: user.id,
      companyId: user.companyId
    });

    const duration = Date.now() - startTime;
    
    logger.apiResponse('GET', '/api/admin/embed/config', 200, duration, {
      userId: user.id,
      companyId: user.companyId
    });

    return NextResponse.json({
      success: true,
      data: {
        embed: {
          allowedOrigins: [
            'https://*.workday.com',
            'https://*.myworkday.com',
          ],
          csp: {
            frameAncestors: [
              'https://*.workday.com',
              'https://*.myworkday.com',
            ],
          },
          user: {
            companyId: user.companyId,
            role: user.roles[0] || 'user',
          },
        },
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Embed config error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get embed config' 
      },
      { status: 500 }
    );
  }
}

// OPTIONS for preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}