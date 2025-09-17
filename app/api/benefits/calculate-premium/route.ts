import { NextRequest, NextResponse } from 'next/server';
import { benefitsService } from '@/lib/services/benefits.service';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { validateBody } from '@/lib/middleware/validation';
import { z } from 'zod';
import { logger } from '@/lib/logging/logger';
import { handleAPIError } from '@/lib/errors/api-errors';

// Request body validation schema
const premiumCalculationSchema = z.object({
  planId: z.string().min(1, 'Plan ID is required'),
  tier: z.enum(['employeeOnly', 'employeeSpouse', 'employeeChildren', 'employeeFamily']),
  payFrequency: z.enum(['monthly', 'biweekly']).optional().default('monthly')
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Extract user info from middleware
    const userId = request.headers.get('x-user-id');
    const companyId = request.headers.get('x-company-id');

    if (!userId || !companyId) {
      logger.securityEvent('Unauthorized premium calculation request', { 
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
    const { data: requestData, error: validationError } = await validateBody(premiumCalculationSchema)(request);
    if (validationError) {
      return validationError;
    }

    const { planId, tier, payFrequency } = requestData as {
      planId: string;
      tier: 'employeeOnly' | 'employeeSpouse' | 'employeeChildren' | 'employeeFamily';
      payFrequency: 'monthly' | 'biweekly';
    };

    logger.info('API Request: POST /api/benefits/calculate-premium', {
      userId,
      companyId,
      planId,
      tier,
      payFrequency
    });

    // Calculate premium
    const calculation = await benefitsService.calculatePremium(planId, tier, payFrequency);

    if (!calculation) {
      logger.warn('Premium calculation failed - plan not found', {
        planId,
        tier,
        payFrequency,
        userId,
        companyId
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Plan not found or premium calculation failed',
          code: 'CALCULATION_FAILED'
        },
        { status: 404 }
      );
    }

    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/benefits/calculate-premium', 200, duration, {
      userId,
      companyId,
      planId,
      tier,
      payFrequency
    });

    return NextResponse.json({
      success: true,
      data: calculation,
      meta: {
        planId,
        tier,
        payFrequency,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Premium calculation API error', {
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
