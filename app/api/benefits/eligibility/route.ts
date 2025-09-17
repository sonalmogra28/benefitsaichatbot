import { NextRequest, NextResponse } from 'next/server';
import { benefitsService } from '@/lib/services/benefits.service';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { validateBody } from '@/lib/middleware/validation';
import { z } from 'zod';
import { logger } from '@/lib/logging/logger';
import { handleAPIError } from '@/lib/errors/api-errors';

// Request body validation schema
const eligibilityRequestSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  employeeType: z.enum(['full-time', 'part-time']),
  hoursWorked: z.number().min(0, 'Hours worked must be positive'),
  region: z.string().min(1, 'Region is required')
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Extract user info from middleware
    const userId = request.headers.get('x-user-id');
    const companyId = request.headers.get('x-company-id');

    if (!userId || !companyId) {
      logger.securityEvent('Unauthorized eligibility check request', {
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
    const { data: requestData, error: validationError } = await validateBody(eligibilityRequestSchema)(request);
    if (validationError) {
      return validationError;
    }

    const { planId, employeeType, hoursWorked, region } = requestData as {
      planId: string;
      employeeType: 'full-time' | 'part-time';
      hoursWorked: number;
      region: string;
    };

    logger.info('API Request: POST /api/benefits/eligibility', {
      userId,
      companyId,
      planId,
      employeeType,
      hoursWorked,
      region
    });

    // Check eligibility
    const eligibility = await benefitsService.checkEligibility(
      planId,
      employeeType,
      hoursWorked,
      region
    );

    // Get plan details for additional context
    const planDetails = await benefitsService.getPlanDetails(planId);

    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/benefits/eligibility', 200, duration, {
      userId,
      companyId,
      planId,
      eligible: eligibility.eligible
    });

    return NextResponse.json({
      success: true,
      data: {
        planId,
        planName: planDetails?.name,
        provider: planDetails?.provider,
        eligible: eligibility.eligible,
        reason: eligibility.reason,
        requirements: planDetails ? {
          employeeType: planDetails.eligibility.employeeType,
          hoursRequired: planDetails.eligibility.hoursRequired,
          waitingPeriod: planDetails.eligibility.waitingPeriod,
          regionalAvailability: planDetails.regionalAvailability
        } : undefined,
        meta: {
          employeeType,
          hoursWorked,
          region,
          timestamp: new Date().toISOString()
        }
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Eligibility check API error', {
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
