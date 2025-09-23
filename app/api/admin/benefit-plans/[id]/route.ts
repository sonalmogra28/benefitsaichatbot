import { type NextRequest, NextResponse } from 'next/server';
import { protectAdminEndpoint } from '@/lib/middleware/auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logging/logger';
import { benefitService } from '@/lib/services/benefit-service';
import { updateBenefitPlanSchema } from '@/lib/schemas/benefits';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET /api/admin/benefit-plans/[id] - Get a specific benefit plan
export async function GET(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { id: planId } = await params;
  
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

    logger.info('API Request: GET /api/admin/benefit-plans/[id]', {
      userId: user.id,
      companyId: user.companyId,
      planId
    });

    // Get the benefit plan
    const plan = await benefitService.getBenefitPlan(planId);
    
    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Benefit plan not found' },
        { status: 404 }
      );
    }

    // Verify the plan belongs to the user's company
    if (plan.companyId !== user.companyId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    const duration = Date.now() - startTime;
    logger.apiResponse('GET', '/api/admin/benefit-plans/[id]', 200, duration, {
      userId: user.id,
      companyId: user.companyId,
      planId
    });

    return NextResponse.json({
      success: true,
      data: plan
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Benefit plan fetch error', {
      path: request.nextUrl.pathname,
      method: request.method,
      planId,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch benefit plan' 
      },
      { status: 500 }
    );
  }
}

// PUT /api/admin/benefit-plans/[id] - Update a benefit plan
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { id: planId } = await params;
  
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
    const validatedData = updateBenefitPlanSchema.parse(body);

    logger.info('API Request: PUT /api/admin/benefit-plans/[id]', {
      userId: user.id,
      companyId: user.companyId,
      planId,
      updateFields: Object.keys(validatedData)
    });

    // Get existing plan to verify ownership
    const existingPlan = await benefitService.getBenefitPlan(planId);
    if (!existingPlan) {
      return NextResponse.json(
        { success: false, error: 'Benefit plan not found' },
        { status: 404 }
      );
    }

    if (existingPlan.companyId !== user.companyId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update the benefit plan
    const updatedPlan = await benefitService.updateBenefitPlan(planId, {
      ...validatedData,
      updatedAt: new Date().toISOString(),
    });

    const duration = Date.now() - startTime;
    logger.apiResponse('PUT', '/api/admin/benefit-plans/[id]', 200, duration, {
      userId: user.id,
      companyId: user.companyId,
      planId
    });

    return NextResponse.json({
      success: true,
      data: updatedPlan,
      message: 'Benefit plan updated successfully'
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
    
    logger.error('Benefit plan update error', {
      path: request.nextUrl.pathname,
      method: request.method,
      planId,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update benefit plan' 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/benefit-plans/[id] - Delete a benefit plan
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { id: planId } = await params;
  
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

    logger.info('API Request: DELETE /api/admin/benefit-plans/[id]', {
      userId: user.id,
      companyId: user.companyId,
      planId
    });

    // Get existing plan to verify ownership
    const existingPlan = await benefitService.getBenefitPlan(planId);
    if (!existingPlan) {
      return NextResponse.json(
        { success: false, error: 'Benefit plan not found' },
        { status: 404 }
      );
    }

    if (existingPlan.companyId !== user.companyId) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Delete the benefit plan
    await benefitService.deleteBenefitPlan(planId);

    const duration = Date.now() - startTime;
    logger.apiResponse('DELETE', '/api/admin/benefit-plans/[id]', 200, duration, {
      userId: user.id,
      companyId: user.companyId,
      planId
    });

    return NextResponse.json({
      success: true,
      message: 'Benefit plan deleted successfully'
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Benefit plan deletion error', {
      path: request.nextUrl.pathname,
      method: request.method,
      planId,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete benefit plan' 
      },
      { status: 500 }
    );
  }
}
