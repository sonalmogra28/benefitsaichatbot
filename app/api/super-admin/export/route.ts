import { type NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin-middleware';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { z } from 'zod';

const exportSchema = z.object({
  companyId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includeTypes: z.array(z.enum([
    'companies',
    'users',
    'documents',
    'chats',
    'messages',
    'audit_logs',
  ])),
  format: z.enum(['json', 'csv', 'excel']).default('json'),
});

const superAdminService = new SuperAdminService();

// POST /api/super-admin/export - Export system data
export const POST = requireSuperAdmin(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validated = exportSchema.parse(body);
    
    const exportData = await superAdminService.exportData({
      ...validated,
      startDate: validated.startDate ? new Date(validated.startDate) : undefined,
      endDate: validated.endDate ? new Date(validated.endDate) : undefined,
    });
    
    // For JSON format, return directly
    if (validated.format === 'json') {
      return NextResponse.json(exportData);
    }
    
    // TODO: Implement CSV and Excel format conversion
    return NextResponse.json(
      { error: 'CSV and Excel formats not yet implemented' },
      { status: 501 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
});