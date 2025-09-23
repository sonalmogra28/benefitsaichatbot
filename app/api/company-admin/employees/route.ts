import { type NextRequest, NextResponse } from 'next/server';
import { requireCompanyAdmin } from '@/lib/auth/admin-middleware';
import { getContainer } from '@/lib/azure/cosmos-db';
import { EmailService } from '@/lib/services/email.service.server';
import { createUserSchema } from '@/lib/validation/schemas';
import { userService } from '@/lib/services/user.service';
import { adminAuth } from '@/lib/auth/admin-auth';
import { companyService } from '@/lib/services/company-service';
import type { UserRole } from '@/lib/constants/roles';
import { z } from 'zod';

const emailService = new EmailService();

// GET /api/company-admin/employees - List employees for a company
export const GET = requireCompanyAdmin(
  async (request: NextRequest, context: any, user: any) => {
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
        offset,
      });

      // Get total count for pagination
      const totalEmployees = await userService.listUsers({
        companyId: user.companyId,
        limit: 1000, // Get all to count total
        offset: 0,
      });

      // Get benefit enrollments to determine enrollment status
      const { benefitService } = await import('@/lib/services/benefit-service');
      const enrollmentPromises = employees.map(async (emp: any) => {
        const enrollments = await benefitService.getEmployeeEnrollments(emp.id);
        return {
          employeeId: emp.id,
          enrollmentStatus: enrollments.length > 0 ? 'enrolled' : 'not_enrolled',
          enrollmentCount: enrollments.length,
        };
      });

      const enrollmentData = await Promise.all(enrollmentPromises);
      const enrollmentMap = new Map(enrollmentData.map(data => [data.employeeId, data]));

      const transformedEmployees = employees.map((emp: any) => {
        const enrollmentInfo = enrollmentMap.get(emp.id);
        return {
          id: emp.id,
          name: `${emp.displayName || emp.name || ''}`.trim() || emp.email,
          email: emp.email,
          role: emp.role || 'employee',
          status: emp.isActive !== false ? 'active' : 'inactive',
          department: emp.department,
          enrollmentStatus: enrollmentInfo?.enrollmentStatus || 'not_enrolled',
          lastActive: emp.updatedAt,
          createdAt: emp.createdAt,
        };
      });

      const hasMore = (page * limit) < totalEmployees.length;

      return NextResponse.json({
        employees: transformedEmployees,
        total: totalEmployees.length,
        page,
        limit,
        hasMore,
      });
    } catch (error) {
      console.error('Error fetching employees:', error);
      return NextResponse.json(
        { error: 'Failed to fetch employees' },
        { status: 500 },
      );
    }
  },
);

// POST /api/company-admin/employees - Invite new employee
export const POST = requireCompanyAdmin(
  async (request: NextRequest, context: any, user: any) => {
    try {
      const body = await request.json();
      const validated = createUserSchema.parse(body);

      const newUser = await adminAuth.createUser({
        email: validated.email,
        displayName: `${validated.firstName} ${validated.lastName}`,
      });

      await userService.assignUserToCompany(newUser.uid, user.companyId);
      await userService.updateUserRole(newUser.uid, validated.role as UserRole);

      // Get company name from Cosmos DB
      const company = await companyService.getCompanyById(user.companyId);
      const companyName = company?.name || 'Your Company';

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

      return NextResponse.json(
        {
          success: true,
          user: {
            id: newUser.uid,
            email: validated.email,
            role: validated.role,
            status: 'pending',
          },
        },
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.errors },
          { status: 400 },
        );
      }

      console.error('Error inviting employee:', error);
      return NextResponse.json(
        { error: 'Failed to invite employee' },
        { status: 500 },
      );
    }
  },
);
