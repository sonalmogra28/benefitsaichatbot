import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/stack-auth';
import { getChatAnalytics, getTopQuestions, getUserActivity, getCostBreakdown } from '@/lib/services/analytics.service';
import { z } from 'zod';

// Schema for query parameters
const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  metric: z.enum(['overview', 'questions', 'users', 'costs']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    if (session.user.type !== 'platform_admin' && 
        session.user.type !== 'company_admin' && 
        session.user.type !== 'hr_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID not found' }, { status: 400 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const params = querySchema.parse({
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      metric: searchParams.get('metric') || 'overview',
    });

    // Parse dates
    const dateRange = params.startDate && params.endDate ? {
      startDate: new Date(params.startDate),
      endDate: new Date(params.endDate),
    } : undefined;

    // Get the requested analytics data
    switch (params.metric) {
      case 'questions':
        const questions = await getTopQuestions(companyId, 20, dateRange);
        return NextResponse.json({ questions });

      case 'users':
        // For user analytics, we'd need to implement a getUsersActivity function
        // For now, return a placeholder
        return NextResponse.json({ 
          users: [],
          message: 'User analytics endpoint coming soon' 
        });

      case 'costs':
        const costs = await getCostBreakdown(companyId, dateRange);
        return NextResponse.json({ costs });

      case 'overview':
      default:
        const analytics = await getChatAnalytics(companyId, dateRange);
        return NextResponse.json({ analytics });
    }

  } catch (error) {
    console.error('Analytics API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

// Export analytics data (for scheduled reports, etc.)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.type !== 'platform_admin' && 
        session.user.type !== 'company_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const companyId = session.user.companyId;
    if (!companyId) {
      return NextResponse.json({ error: 'Company ID not found' }, { status: 400 });
    }

    const body = await request.json();
    const { format = 'json', dateRange } = body;

    // Get all analytics data
    const [analytics, questions, costs] = await Promise.all([
      getChatAnalytics(companyId, dateRange),
      getTopQuestions(companyId, 50, dateRange),
      getCostBreakdown(companyId, dateRange),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      companyId,
      dateRange,
      analytics,
      topQuestions: questions,
      costBreakdown: costs,
    };

    // For now, just return JSON. In the future, could support CSV, PDF, etc.
    if (format === 'csv') {
      // TODO: Implement CSV export
      return NextResponse.json({ 
        error: 'CSV export not yet implemented' 
      }, { status: 501 });
    }

    return NextResponse.json(exportData);

  } catch (error) {
    console.error('Analytics export error:', error);
    return NextResponse.json(
      { error: 'Failed to export analytics' },
      { status: 500 }
    );
  }
}