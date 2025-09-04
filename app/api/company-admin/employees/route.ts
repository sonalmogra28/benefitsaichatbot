import { type NextRequest, NextResponse } from 'next/server';
import { requireCompanyAdmin } from '@/lib/auth/admin-middleware';
import { userService } from '@/lib/firebase/services/user.service';
import { adminAuth } from '@/lib/firebase/admin';
import { EmailService } from '@/lib/services/email.service.server';
import { createUserSchema } from '@/lib/validation/schemas';
import type { UserRole } from '@/lib/constants/roles';
import { z } from 'zod';

const emailService = new EmailService();

// GET /api/company-admin/employees - List employees for a company
export const GET = requireCompanyAdmin(async (
  request: NextRequest,
  context,
  user
) => {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || 'all';
    const status = searchParams.get('status') || 'all';
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const employees = await userService.listUsers({
      companyId: user.companyId,
      limit,
    });

    const transformedEmployees = employees.map(emp => ({
      id: emp.uid,
      name: `${emp.displayName || ''}`.trim() || emp.email,
      email: emp.email,
      role: emp.role || 'employee',
      status: 'active', // TODO: Add isActive to user model
      department: emp.department,
      enrollmentStatus: 'not_enrolled', // TODO: Implement enrollment status
      lastActive: emp.updatedAt,
      createdAt: emp.createdAt,
    }));

    return NextResponse.json({
      employees: transformedEmployees,
      total: transformedEmployees.length, // TODO: Implement total count
      page,
      limit,
      hasMore: false, // TODO: Implement hasMore
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
});

// POST /api/company-admin/employees - Invite new employee
export const POST = requireCompanyAdmin(async (
  request: NextRequest,
  context,
  user
) => {
  try {
    const body = await request.json();
    const validated = createUserSchema.parse(body);

    const newUser = await adminAuth.createUser({
      email: validated.email,
      displayName: `${validated.firstName} ${validated.lastName}`,
    });

    await userService.assignUserToCompany(newUser.uid, user.companyId);
    await userService.updateUserRole(newUser.uid, validated.role as UserRole);

    // TODO: Get company name from Firestore
    const companyName = 'Your Company';

    try {
      await emailService.sendEmployeeInvitation({
        email: validated.email,
        companyName,
        inviterName: user.name || user.email,
        role: validated.role,
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the whole operation if email fails
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.uid,
        email: newUser.email,
        role: validated.role,
        status: 'pending',
      },
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error inviting employee:', error);
    return NextResponse.json(
      { error: 'Failed to invite employee' },
      { status: 500 }
    );
  }
});
