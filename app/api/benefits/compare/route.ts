import { NextRequest, NextResponse } from 'next/server';
import { benefitsService } from '@/lib/services/benefits.service';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { validateBody } from '@/lib/middleware/validation';
import { z } from 'zod';
import { logger } from '@/lib/logging/logger';
import { handleAPIError } from '@/lib/errors/api-errors';

// Request body validation schema
const comparisonRequestSchema = z.object({
  planIds: z.array(z.string()).min(2, 'At least 2 plans required for comparison').max(5, 'Maximum 5 plans for comparison'),
  region: z.string().optional(),
  employeeType: z.enum(['full-time', 'part-time']).optional(),
  hoursWorked: z.number().optional()
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Extract user info from middleware
    const userId = request.headers.get('x-user-id');
    const companyId = request.headers.get('x-company-id');

    if (!userId || !companyId) {
      logger.securityEvent('Unauthorized benefits comparison request', {
        userAgent: request.headers.get('user-agent'),
      });
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.api(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Validate request body
    const { data: requestData, error: validationError } = await validateBody(comparisonRequestSchema)(request);
    if (validationError) {
      return validationError;
    }

    const { planIds, region, employeeType, hoursWorked } = requestData as {
      planIds: string[];
      region?: string;
      employeeType?: 'full-time' | 'part-time';
      hoursWorked?: number;
    };

    logger.info('API Request: POST /api/benefits/compare', {
      userId,
      companyId,
      planIds,
      region,
      employeeType,
      hoursWorked
    });

    // Get plan comparisons
    const comparisons = await benefitsService.comparePlans(planIds);

    // Check eligibility for each plan if employee info provided
    const eligibilityChecks = [];
    if (employeeType && hoursWorked !== undefined && region) {
      for (const planId of planIds) {
        const eligibility = await benefitsService.checkEligibility(
          planId,
          employeeType,
          hoursWorked,
          region
        );
        eligibilityChecks.push({
          planId,
          ...eligibility
        });
      }
    }

    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/benefits/compare', 200, duration, {
      userId,
      companyId,
      planCount: comparisons.length
    });

    return NextResponse.json({
      success: true,
      data: {
        comparisons,
        eligibility: eligibilityChecks.length > 0 ? eligibilityChecks : undefined,
        meta: {
          planCount: comparisons.length,
          region,
          employeeType,
          hoursWorked,
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Benefits comparison API error', {
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
