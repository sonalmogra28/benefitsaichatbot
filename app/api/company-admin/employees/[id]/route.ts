import { NextRequest, NextResponse } from 'next/server';
import { withCompanyAdminAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { userService } from '@/lib/services/user-service';
import { userMetadataSchema } from '@/lib/schemas/user';
import { logger } from '@/lib/logger';

export const GET = withCompanyAdminAuth(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('id');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    const employee = await userService.getUserById(employeeId);
    
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Ensure user can only access employees from their company
    if (employee.companyId !== request.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({ employee });
  } catch (error) {
    logger.error('Error fetching employee', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      employeeId: new URL(request.url).searchParams.get('id')
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const PUT = withCompanyAdminAuth(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('id');
    const body = await request.json();

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    // Validate request body
    const validatedData = userMetadataSchema.parse(body);

    const updatedEmployee = await userService.updateUser(employeeId, validatedData);

    return NextResponse.json({ employee: updatedEmployee });
  } catch (error) {
    logger.error('Error updating employee', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      employeeId: new URL(request.url).searchParams.get('id')
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const DELETE = withCompanyAdminAuth(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('id');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    // Check if employee exists and belongs to the same company
    const employee = await userService.getUserById(employeeId);
    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (employee.companyId !== request.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await userService.deleteUser(employeeId);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error deleting employee', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      employeeId: new URL(request.url).searchParams.get('id')
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});