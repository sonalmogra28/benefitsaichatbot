import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/stack-auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const updateEmployeeSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  department: z.string().optional(),
  role: z.enum(['employee', 'admin', 'company_admin']).optional(),
  isActive: z.boolean().optional(),
});

// GET /api/company-admin/employees/[id] - Get specific employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employee = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, id),
        eq(users.companyId, session.user.companyId)
      ))
      .limit(1);

    if (employee.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json({ employee: employee[0] });
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee' },
      { status: 500 }
    );
  }
}

// PATCH /api/company-admin/employees/[id] - Update employee
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to update employees
    if (session.user.type !== 'company_admin' && session.user.type !== 'hr_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validated = updateEmployeeSchema.parse(body);

    // Check if employee exists in company
    const existingEmployee = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, id),
        eq(users.companyId, session.user.companyId)
      ))
      .limit(1);

    if (existingEmployee.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Prevent downgrading own permissions
    if (id === session.user.id && validated.role && validated.role !== session.user.type) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    // Update the employee
    const [updatedEmployee] = await db
      .update(users)
      .set({
        ...validated,
        updatedAt: new Date(),
      })
      .where(and(
        eq(users.id, id),
        eq(users.companyId, session.user.companyId)
      ))
      .returning();

    return NextResponse.json({ employee: updatedEmployee });
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
}

// DELETE /api/company-admin/employees/[id] - Deactivate employee
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to deactivate employees
    if (session.user.type !== 'company_admin' && session.user.type !== 'hr_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Prevent self-deactivation
    if (id === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot deactivate your own account' },
        { status: 400 }
      );
    }

    // Check if employee exists in company
    const existingEmployee = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, id),
        eq(users.companyId, session.user.companyId)
      ))
      .limit(1);

    if (existingEmployee.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Deactivate the employee (soft delete)
    await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(
        eq(users.id, id),
        eq(users.companyId, session.user.companyId)
      ));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deactivating employee:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate employee' },
      { status: 500 }
    );
  }
}