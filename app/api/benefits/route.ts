import { NextRequest, NextResponse } from 'next/server';
import { benefitsService } from '@/lib/services/benefits.service';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { validateQueryParams } from '@/lib/middleware/validation';
import { z } from 'zod';
import { logger } from '@/lib/logging/logger';
import { handleAPIError } from '@/lib/errors/api-errors';

// Query parameter validation schema
const benefitsQuerySchema = z.object({
  region: z.string().optional(),
  employeeType: z.enum(['full-time', 'part-time']).optional(),
  hoursWorked: z.string().optional(),
  planType: z.enum(['medical', 'dental', 'vision', 'life', 'disability', 'voluntary']).optional(),
  provider: z.string().optional(),
  search: z.string().optional(),
  compare: z.string().optional(), // Comma-separated plan IDs
});

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Extract user info from middleware
    const userId = request.headers.get('x-user-id');
    const companyId = request.headers.get('x-company-id');

    if (!userId || !companyId) {
      logger.securityEvent('Unauthorized benefits request', {
        userAgent: request.headers.get('user-agent'),
      });
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.api(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Validate query parameters
    const { data: queryData, error: validationError } = validateQueryParams(benefitsQuerySchema)(request);
    if (validationError) {
      return validationError;
    }

    const query = {
      ...queryData,
      hoursWorked: queryData.hoursWorked ? Number(queryData.hoursWorked) : undefined
    } as {
      region?: string;
      employeeType?: 'full-time' | 'part-time';
      hoursWorked?: number;
      planType?: 'medical' | 'dental' | 'vision' | 'life' | 'disability' | 'voluntary';
      provider?: string;
      search?: string;
      compare?: string;
    };

    logger.info('API Request: GET /api/benefits', {
      userId,
      companyId,
      query
    });

    let responseData: any;

    // Handle different query types
    if (query.search) {
      // Search plans by keyword
      responseData = await benefitsService.searchPlans(query.search, query.region);
    } else if (query.compare) {
      // Compare specific plans
      const planIds = query.compare.split(',').map(id => id.trim());
      responseData = await benefitsService.comparePlans(planIds);
    } else {
      // Get available plans with filters
      responseData = await benefitsService.getAvailablePlans({
        region: query.region,
        employeeType: query.employeeType,
        hoursWorked: query.hoursWorked,
        planType: query.planType,
        provider: query.provider
      });
    }

    const duration = Date.now() - startTime;
    logger.apiResponse('GET', '/api/benefits', 200, duration, {
      userId,
      companyId,
      resultCount: Array.isArray(responseData) ? responseData.length : 1
    });

    return NextResponse.json({
      success: true,
      data: responseData,
      meta: {
        count: Array.isArray(responseData) ? responseData.length : 1,
        query,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Benefits API error', {
      path: request.nextUrl.pathname,
      method: request.method,
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
