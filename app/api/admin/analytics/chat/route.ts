import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/admin-middleware';
import { USER_ROLES } from '@/lib/constants/roles';
import { z } from 'zod';

// Schema for query parameters
const querySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  metric: z.enum(['overview', 'questions', 'users', 'costs']).optional(),
});

export const GET = withAuth(
  USER_ROLES.COMPANY_ADMIN,
  async (request: NextRequest, context, user) => {
    try {
      const companyId = user.companyId;
      if (!companyId) {
        return NextResponse.json(
          { error: 'Company ID not found' },
          { status: 400 },
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

      // Get the requested analytics data
      switch (params.metric) {
        case 'questions': {
          return NextResponse.json({ questions: [] });
        }

        case 'users':
          return NextResponse.json({
            users: [],
            message: 'User analytics endpoint coming soon',
          });

        case 'costs': {
          return NextResponse.json({ costs: [] });
        }

        case 'overview':
        default: {
          return NextResponse.json({ analytics: {} });
        }
      }
    } catch (error) {
      console.error('Analytics API error:', error);

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid parameters', details: error.errors },
          { status: 400 },
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 },
      );
    }
  },
);

// Export analytics data (for scheduled reports, etc.)
export const POST = withAuth(
  USER_ROLES.COMPANY_ADMIN,
  async (request: NextRequest, context, user) => {
    try {
      const companyId = user.companyId;
      if (!companyId) {
        return NextResponse.json(
          { error: 'Company ID not found' },
          { status: 400 },
        );
      }

      const body = await request.json();
      const { format = 'json', dateRange } = body;

      const exportData = {
        exportedAt: new Date().toISOString(),
        companyId,
        dateRange,
        analytics: {},
        topQuestions: [],
        costBreakdown: [],
      };

      // For now, just return JSON. In the future, could support CSV, PDF, etc.
      if (format === 'csv') {
        // TODO: Implement CSV export
        return NextResponse.json(
          {
            error: 'CSV export not yet implemented',
          },
          { status: 501 },
        );
      }

      return NextResponse.json(exportData);
    } catch (error) {
      console.error('Analytics export error:', error);
      return NextResponse.json(
        { error: 'Failed to export analytics' },
        { status: 500 },
      );
    }
  },
);
