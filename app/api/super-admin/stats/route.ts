import { type NextRequest, NextResponse } from 'next/server';
import { protectSuperAdminEndpoint } from '@/lib/middleware/auth';
import { analyticsService } from '@/lib/services/analytics.service';
import { logger } from '@/lib/logging/logger';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Authenticate and authorize
    const { user, error } = await protectSuperAdminEndpoint(request);
    if (error || !user) {
      return error!;
    }

    logger.info('API Request: GET /api/super-admin/stats', {
      userId: user.id
    });

    // Get platform analytics
    const analytics = await analyticsService.getPlatformAnalytics();
    
    // Calculate additional metrics
    const monthlyGrowth = await calculateMonthlyGrowth();
    const systemHealth = determineSystemHealth(analytics);
    
    const stats = {
      totalUsers: analytics.totalUsers,
      totalDocuments: analytics.totalDocuments,
      totalBenefitPlans: analytics.totalBenefitPlans,
      activeEnrollments: analytics.activeUsers,
      activeChats: analytics.totalConversations,
      monthlyGrowth,
      systemHealth,
      apiUsage: analytics.apiCalls,
      storageUsed: analytics.storageUsed,
      systemMetrics: analytics.systemMetrics
    };

    const duration = Date.now() - startTime;
    
    logger.apiResponse('GET', '/api/super-admin/stats', 200, duration, {
      userId: user.id,
      totalUsers: stats.totalUsers,
      totalDocuments: stats.totalDocuments
    });

    return NextResponse.json({
      success: true,
      data: stats
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Super admin stats error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch platform stats' 
      },
      { status: 500 }
    );
  }
}

async function calculateMonthlyGrowth(): Promise<number> {
  try {
    // Calculate growth based on user registrations this month vs last month
    // This is a simplified calculation
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // In a real implementation, you'd query the database for user counts
    // For now, return a placeholder
    return 12.5; // 12.5% growth
  } catch (error) {
    logger.error('Failed to calculate monthly growth', error);
    return 0;
  }
}

function determineSystemHealth(analytics: any): 'healthy' | 'degraded' | 'critical' {
  try {
    const { systemMetrics } = analytics;
    
    if (!systemMetrics) {
      return 'degraded';
    }
    
    const { cpuUsage, memoryUsage, errorRate } = systemMetrics;
    
    // Determine health based on metrics
    if (cpuUsage > 90 || memoryUsage > 90 || errorRate > 10) {
      return 'critical';
    } else if (cpuUsage > 70 || memoryUsage > 70 || errorRate > 5) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  } catch (error) {
    logger.error('Failed to determine system health', error);
    return 'degraded';
  }
}
