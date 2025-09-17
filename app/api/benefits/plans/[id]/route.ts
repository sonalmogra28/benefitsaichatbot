import { NextRequest, NextResponse } from 'next/server';
import { benefitsService } from '@/lib/services/benefits.service';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logging/logger';
import { handleAPIError } from '@/lib/errors/api-errors';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const startTime = Date.now();
  
  try {
    // Extract user info from middleware
    const userId = request.headers.get('x-user-id');
    const companyId = request.headers.get('x-company-id');

    if (!userId || !companyId) {
      logger.securityEvent('Unauthorized plan details request', {
        userAgent: request.headers.get('user-agent'),
        planId: id
      });
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.api(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    logger.info('API Request: GET /api/benefits/plans/[id]', {
      userId,
      companyId,
      planId: id
    });

    // Get plan details
    const plan = await benefitsService.getPlanDetails(id);

    if (!plan) {
      logger.warn('Plan not found', { planId: id, userId, companyId });
      return NextResponse.json(
        {
          success: false,
          error: 'Plan not found',
          code: 'PLAN_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const duration = Date.now() - startTime;
    logger.apiResponse('GET', `/api/benefits/plans/${id}`, 200, duration, {
      userId,
      companyId,
      planId: id
    });

    return NextResponse.json({
      success: true,
      data: plan,
      meta: {
        planId: id,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Plan details API error', {
      path: request.nextUrl.pathname,
      method: request.method,
      planId: id,
      duration
    }, error as Error);

    const apiError = handleAPIError(error);
    return NextResponse.json(
      {
        success: false,
        error: apiError.message,
        code: apiError.code
      },
      { status: apiError.statusCode }
    );
  }
}
