import { type NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin-middleware';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { CSVExporter } from '@/lib/utils/csv-export';
import { ExcelExporter } from '@/lib/utils/excel-export';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const exportSchema = z.object({
  companyId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  includeTypes: z.array(
    z.enum([
      'companies',
      'users',
      'documents',
      'chats',
      'messages',
      'audit_logs',
    ]),
  ),
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
      startDate: validated.startDate
        ? new Date(validated.startDate)
        : undefined,
      endDate: validated.endDate ? new Date(validated.endDate) : undefined,
    });

    // For JSON format, return directly
    if (validated.format === 'json') {
      return NextResponse.json(exportData);
    }

    // Handle CSV format
    if (validated.format === 'csv') {
      const csvContent = convertExportDataToCSV(exportData);
      const filename = `super-admin-export-${new Date().toISOString().split('T')[0]}.csv`;
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': Buffer.byteLength(csvContent, 'utf8').toString()
        }
      });
    }

    // Handle Excel format
    if (validated.format === 'excel') {
      const excelBuffer = convertExportDataToExcel(exportData);
      const filename = `super-admin-export-${new Date().toISOString().split('T')[0]}.xlsx`;
      
      return new NextResponse(excelBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': excelBuffer.length.toString()
        }
      });
    }

    return NextResponse.json(
      { error: 'Unsupported format' },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 },
      );
    }

    logger.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 },
    );
  }
});

/**
 * Convert export data to CSV format
 */
function convertExportDataToCSV(exportData: any): string {
  const csvSections: string[] = [];
  
  Object.keys(exportData).forEach(sectionName => {
    const data = exportData[sectionName];
    if (Array.isArray(data) && data.length > 0) {
      csvSections.push(`\n=== ${sectionName.toUpperCase()} ===\n`);
      csvSections.push(CSVExporter.arrayToCSV(data, {
        includeHeaders: true,
        delimiter: ','
      }));
    }
  });
  
  return csvSections.join('\n');
}

/**
 * Convert export data to Excel format
 */
function convertExportDataToExcel(exportData: any): Buffer {
  const { arrayToExcel } = ExcelExporter;
  
  // If there's only one section, export it directly
  const sections = Object.keys(exportData).filter(key => 
    Array.isArray(exportData[key]) && exportData[key].length > 0
  );
  
  if (sections.length === 1) {
    const sectionName = sections[0];
    return arrayToExcel(exportData[sectionName], {
      sheetName: sectionName,
      includeHeaders: true
    });
  }
  
  // For multiple sections, we'll create a summary sheet
  // This is a simplified approach - in production you might want to create multiple sheets
  const summaryData = sections.map(sectionName => ({
    section: sectionName,
    recordCount: exportData[sectionName].length,
    lastUpdated: new Date().toISOString()
  }));
  
  return arrayToExcel(summaryData, {
    sheetName: 'Export Summary',
    includeHeaders: true
  });
}
