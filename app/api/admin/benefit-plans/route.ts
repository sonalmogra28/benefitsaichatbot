import { type NextRequest, NextResponse } from 'next/server';
import { protectAdminEndpoint } from '@/lib/middleware/auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logging/logger';
import { benefitService } from '@/lib/services/benefit-service';
import { createBenefitPlanSchema } from '@/lib/schemas/benefits';
import { z } from 'zod';

// POST /api/admin/benefit-plans - Create a new benefit plan
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validatedData = createBenefitPlanSchema.parse(body);

    logger.info('API Request: POST /api/admin/benefit-plans', {
      userId: user.id,
      companyId: user.companyId,
      planName: validatedData.name
    });

    // Create the benefit plan
    const newPlan = await benefitService.createBenefitPlan({
      ...validatedData,
      companyId: user.companyId,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/admin/benefit-plans', 201, duration, {
      userId: user.id,
      companyId: user.companyId,
      planId: newPlan.id
    });

    return NextResponse.json({
      success: true,
      data: newPlan,
      message: 'Benefit plan created successfully'
    }, { status: 201 });

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
    
    logger.error('Benefit plan creation error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create benefit plan' 
      },
      { status: 500 }
    );
  }
}

// GET /api/admin/benefit-plans - Get all benefit plans for the company
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

    logger.info('API Request: GET /api/admin/benefit-plans', {
      userId: user.id,
      companyId: user.companyId
    });

    // Get all benefit plans for the company
    const plans = await benefitService.getBenefitPlans(user.companyId);

    const duration = Date.now() - startTime;
    logger.apiResponse('GET', '/api/admin/benefit-plans', 200, duration, {
      userId: user.id,
      companyId: user.companyId,
      planCount: plans.length
    });

    return NextResponse.json({
      success: true,
      data: plans,
      meta: {
        count: plans.length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Benefit plans fetch error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch benefit plans' 
      },
      { status: 500 }
    );
  }
}
