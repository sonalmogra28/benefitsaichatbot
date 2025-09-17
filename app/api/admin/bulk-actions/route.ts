import { type NextRequest, NextResponse } from 'next/server';
import { protectAdminEndpoint } from '@/lib/middleware/auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logging/logger';
import { getRepositories } from '@/lib/azure/cosmos';
import { emailService } from '@/lib/services/email.service';
import { z } from 'zod';

const bulkActionSchema = z.object({
  action: z.enum(['activate', 'deactivate', 'send_email', 'export', 'delete']),
  employeeIds: z.array(z.string()).min(1, 'At least one employee must be selected'),
  companyId: z.string().min(1, 'Company ID is required'),
  emailType: z.enum(['welcome', 'reminder', 'notification']).optional(),
  emailSubject: z.string().optional(),
  emailMessage: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const rateLimitResponse = await rateLimiters.admin(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const { user, error } = await protectAdminEndpoint(request);
    if (error || !user) {
      return error!;
    }

    const body = await request.json();
    const validatedData = bulkActionSchema.parse(body);

    const { action, employeeIds, companyId, emailType, emailSubject, emailMessage } = validatedData;

    logger.info('Bulk action initiated', {
      userId: user.id,
      companyId,
      action,
      employeeCount: employeeIds.length
    });

    const repositories = await getRepositories();
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    switch (action) {
      case 'activate':
        await handleBulkActivate(employeeIds, companyId, repositories, results);
        break;
      case 'deactivate':
        await handleBulkDeactivate(employeeIds, companyId, repositories, results);
        break;
      case 'send_email':
        await handleBulkEmail(employeeIds, companyId, emailType!, emailSubject, emailMessage, repositories, results);
        break;
      case 'export':
        await handleBulkExport(employeeIds, companyId, repositories, results);
        break;
      case 'delete':
        await handleBulkDelete(employeeIds, companyId, repositories, results);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/admin/bulk-actions', 200, duration, {
      userId: user.id,
      companyId,
      action,
      results
    });

    return NextResponse.json({
      success: true,
      message: `Bulk ${action} completed`,
      results
    });
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    logger.error('Bulk action error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);

    return NextResponse.json(
      { success: false, error: 'Failed to process bulk action' },
      { status: 500 }
    );
  }
}

async function handleBulkActivate(
  employeeIds: string[],
  companyId: string,
  repositories: any,
  results: { success: number; failed: number; errors: string[] }
) {
  for (const employeeId of employeeIds) {
    try {
      await repositories.users.update(employeeId, {
        isActive: true,
        updatedAt: new Date()
      }, companyId);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to activate employee ${employeeId}: ${(error as Error).message}`);
    }
  }
}

async function handleBulkDeactivate(
  employeeIds: string[],
  companyId: string,
  repositories: any,
  results: { success: number; failed: number; errors: string[] }
) {
  for (const employeeId of employeeIds) {
    try {
      await repositories.users.update(employeeId, {
        isActive: false,
        updatedAt: new Date()
      }, companyId);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to deactivate employee ${employeeId}: ${(error as Error).message}`);
    }
  }
}

async function handleBulkEmail(
  employeeIds: string[],
  companyId: string,
  emailType: string,
  emailSubject: string | undefined,
  emailMessage: string | undefined,
  repositories: any,
  results: { success: number; failed: number; errors: string[] }
) {
  for (const employeeId of employeeIds) {
    try {
      const employee = await repositories.users.getById(employeeId, companyId);
      if (!employee) {
        results.failed++;
        results.errors.push(`Employee ${employeeId} not found`);
        continue;
      }

      const subject = emailSubject || `Welcome to ${companyId} Benefits Assistant`;
      const message = emailMessage || `Welcome to your company's benefits assistant!`;

      await emailService.sendEmail({
        to: employee.email,
        subject,
        textContent: message
      });

      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to send email to employee ${employeeId}: ${(error as Error).message}`);
    }
  }
}

async function handleBulkExport(
  employeeIds: string[],
  companyId: string,
  repositories: any,
  results: { success: number; failed: number; errors: string[] }
) {
  try {
    const employees = [];
    for (const employeeId of employeeIds) {
      const employee = await repositories.users.getById(employeeId, companyId);
      if (employee) {
        employees.push(employee);
      }
    }

    // Convert to CSV format
    const csvContent = convertEmployeesToCSV(employees);
    
    results.success = employees.length;
    results.failed = employeeIds.length - employees.length;
  } catch (error) {
    results.failed = employeeIds.length;
    results.errors.push(`Failed to export employees: ${(error as Error).message}`);
  }
}

async function handleBulkDelete(
  employeeIds: string[],
  companyId: string,
  repositories: any,
  results: { success: number; failed: number; errors: string[] }
) {
  for (const employeeId of employeeIds) {
    try {
      await repositories.users.delete(employeeId, companyId);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to delete employee ${employeeId}: ${(error as Error).message}`);
    }
  }
}

function convertEmployeesToCSV(employees: any[]): string {
  if (employees.length === 0) return '';

  const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Department', 'Created At'];
  const rows = employees.map(emp => [
    emp.id,
    emp.displayName || emp.name || '',
    emp.email,
    emp.role,
    emp.isActive ? 'active' : 'inactive',
    emp.department || '',
    emp.createdAt ? new Date(emp.createdAt).toISOString() : ''
  ]);

  return [headers, ...rows].map(row => 
    row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
  ).join('\n');
}
