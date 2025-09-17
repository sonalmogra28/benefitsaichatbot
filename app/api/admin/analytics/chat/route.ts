import { type NextRequest, NextResponse } from 'next/server';
import { protectAdminEndpoint, extractUserContext } from '@/lib/middleware/auth';
import { analyticsService } from '@/lib/services/analytics.service';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logging/logger';
import { z } from 'zod';

// Schema for query parameters
const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  metric: z.enum(['overview', 'questions', 'users', 'costs']).optional(),
});

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

    const companyId = user.companyId;
    if (!companyId) {
      logger.warn('Company ID not found for admin user', { userId: user.id });
      return NextResponse.json(
        { error: 'Company ID not found' },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse({
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      metric: searchParams.get('metric') || 'overview',
    });

    // Parse dates
    const dateRange =
      params.startDate && params.endDate
        ? {
            startDate: new Date(params.startDate),
            endDate: new Date(params.endDate),
          }
        : undefined;

    logger.info('API Request: GET /api/admin/analytics/chat', {
      userId: user.id,
      companyId,
      metric: params.metric
    });

    // Get the requested analytics data
    switch (params.metric) {
      case 'questions': {
        const chatAnalytics = await analyticsService.getChatAnalytics(companyId);
        const duration = Date.now() - startTime;
        
        logger.apiResponse('GET', '/api/admin/analytics/chat', 200, duration, {
          userId: user.id,
          companyId,
          metric: 'questions'
        });
        
        return NextResponse.json({
          success: true,
          data: {
            topQuestions: chatAnalytics.topQuestions,
            totalChats: chatAnalytics.totalChats,
            averageMessagesPerChat: chatAnalytics.averageMessagesPerChat,
          }
        });
      }

      case 'users': {
        const userActivity = await analyticsService.getUserActivity(companyId);
        const duration = Date.now() - startTime;
        
        logger.apiResponse('GET', '/api/admin/analytics/chat', 200, duration, {
          userId: user.id,
          companyId,
          metric: 'users'
        });
        
        return NextResponse.json({
          success: true,
          data: {
            users: userActivity,
            totalUsers: userActivity.length,
          }
        });
      }

      case 'costs': {
        const companyAnalytics = await analyticsService.getCompanyAnalytics(companyId);
        const duration = Date.now() - startTime;
        
        logger.apiResponse('GET', '/api/admin/analytics/chat', 200, duration, {
          userId: user.id,
          companyId,
          metric: 'costs'
        });
        
        return NextResponse.json({
          success: true,
          data: {
            averageCostPerEmployee: companyAnalytics.averageCostPerEmployee,
            employeeCount: companyAnalytics.employeeCount,
            enrollmentRate: companyAnalytics.enrollmentRate,
          }
        });
      }

      case 'overview':
      default: {
        const [chatAnalytics, companyAnalytics, userActivity] = await Promise.all([
          analyticsService.getChatAnalytics(companyId),
          analyticsService.getCompanyAnalytics(companyId),
          analyticsService.getUserActivity(companyId),
        ]);

        const duration = Date.now() - startTime;
        
        logger.apiResponse('GET', '/api/admin/analytics/chat', 200, duration, {
          userId: user.id,
          companyId,
          metric: 'overview'
        });

        return NextResponse.json({
          success: true,
          data: {
            overview: {
              totalChats: chatAnalytics.totalChats,
              averageMessagesPerChat: chatAnalytics.averageMessagesPerChat,
              peakHours: chatAnalytics.peakHours,
              employeeCount: companyAnalytics.employeeCount,
              activeEmployees: companyAnalytics.activeEmployees,
              monthlyChats: companyAnalytics.monthlyChats,
              enrollmentRate: companyAnalytics.enrollmentRate,
              topQuestions: chatAnalytics.topQuestions.slice(0, 5),
              recentActivity: userActivity.slice(0, 10),
            },
          }
        });
      }
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Analytics API error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid parameters', 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch analytics' 
      },
      { status: 500 }
    );
  }
}

// Export analytics data (for scheduled reports, etc.)
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

    const companyId = user.companyId;
    if (!companyId) {
      logger.warn('Company ID not found for admin user', { userId: user.id });
      return NextResponse.json(
        { success: false, error: 'Company ID not found' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { format = 'json', dateRange } = body;

    logger.info('API Request: POST /api/admin/analytics/chat', {
      userId: user.id,
      companyId,
      format
    });

    // Get all analytics data
    const [chatAnalytics, companyAnalytics, userActivity] = await Promise.all([
      analyticsService.getChatAnalytics(companyId),
      analyticsService.getCompanyAnalytics(companyId),
      analyticsService.getUserActivity(companyId),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      companyId,
      dateRange,
      analytics: {
        chat: chatAnalytics,
        company: companyAnalytics,
        users: userActivity,
      },
    };

    const duration = Date.now() - startTime;
    
    logger.apiResponse('POST', '/api/admin/analytics/chat', 200, duration, {
      userId: user.id,
      companyId,
      format
    });

    // For now, just return JSON. In the future, could support CSV, PDF, etc.
    if (format === 'csv') {
      // TODO: Implement CSV export
      return NextResponse.json(
        {
          success: false,
          error: 'CSV export not yet implemented',
        },
        { status: 501 }
      );
    }

    return NextResponse.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Analytics export error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);

    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to export analytics' 
      },
      { status: 500 }
    );
  }
}
