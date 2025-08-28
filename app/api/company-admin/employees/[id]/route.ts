import { type NextRequest, NextResponse } from 'next/server';
import { requireCompanyAdmin } from '@/lib/auth/admin-middleware';
import { userService, userMetadataSchema } from '@/lib/firebase/services/user.service';
import { z } from 'zod';

// GET /api/company-admin/employees/[id] - Get specific employee
export const GET = requireCompanyAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } },
  user
) => {
  try {
    const employee = await userService.getUserFromFirestore(params.id);

    if (!employee || employee.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee' },
      { status: 500 }
    );
  }
});

// PATCH /api/company-admin/employees/[id] - Update employee
export const PATCH = requireCompanyAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } },
  user
) => {
  try {
    const body = await request.json();
    const validated = userMetadataSchema.parse(body);

    const employee = await userService.getUserFromFirestore(params.id);

    if (!employee || employee.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Prevent downgrading own permissions
    if (params.id === user.uid && validated.userType && validated.userType !== user.role) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    await userService.updateUserMetadata(params.id, validated);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    );
  }
});

// DELETE /api/company-admin/employees/[id] - Deactivate employee
export const DELETE = requireCompanyAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } },
  user
) => {
  try {
    // Prevent self-deactivation
    if (params.id === user.uid) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      );
    }

    const employee = await userService.getUserFromFirestore(params.id);

    if (!employee || employee.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    await userService.deleteUser(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deactivating employee:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate employee' },
      { status: 500 }
    );
  }
});
