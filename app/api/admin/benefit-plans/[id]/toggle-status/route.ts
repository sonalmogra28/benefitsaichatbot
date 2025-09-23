import { type NextRequest, NextResponse } from 'next/server';
import { protectAdminEndpoint } from '@/lib/middleware/auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logging/logger';
import { benefitService } from '@/lib/services/benefit-service';
import { z } from 'zod';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

const toggleStatusSchema = z.object({
  isActive: z.boolean()
});

// PATCH /api/admin/benefit-plans/[id]/toggle-status - Toggle benefit plan status
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const { isActive } = toggleStatusSchema.parse(body);

    logger.info('API Request: PATCH /api/admin/benefit-plans/[id]/toggle-status', {
      userId: user.id,
      companyId: user.companyId,
      planId,
      isActive
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

    // Update the benefit plan status
    const updatedPlan = await benefitService.updateBenefitPlan(planId, {
      isActive,
      updatedAt: new Date().toISOString(),
    });

    const duration = Date.now() - startTime;
    logger.apiResponse('PATCH', '/api/admin/benefit-plans/[id]/toggle-status', 200, duration, {
      userId: user.id,
      companyId: user.companyId,
      planId,
      isActive
    });

    return NextResponse.json({
      success: true,
      data: updatedPlan,
      message: `Benefit plan ${isActive ? 'activated' : 'deactivated'} successfully`
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
    
    logger.error('Benefit plan status toggle error', {
      path: request.nextUrl.pathname,
      method: request.method,
      planId,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to toggle benefit plan status' 
      },
      { status: 500 }
    );
  }
}
