import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/stack-auth';
import { db } from '@/lib/db';
import { users, benefitEnrollments } from '@/lib/db/schema';
import { eq, and, count, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { EmailService } from '@/lib/services/email.service';

const inviteEmployeeSchema = z.object({
  email: z.string().email(),
  role: z.enum(['employee', 'admin', 'company_admin']),
  department: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const emailService = new EmailService();

// GET /api/company-admin/employees - List employees for a company
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || 'all';
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [eq(users.companyId, session.user.companyId)];
    
    if (role !== 'all') {
      whereConditions.push(eq(users.role, role));
    }
    
    if (status !== 'all') {
      whereConditions.push(eq(users.isActive, status === 'active'));
    }
    
    if (search) {
      whereConditions.push(
        sql`${users.firstName} ILIKE ${`%${search}%`} OR ${users.lastName} ILIKE ${`%${search}%`} OR ${users.email} ILIKE ${`%${search}%`} OR ${users.department} ILIKE ${`%${search}%`}`
      );
    }

    // Get total count
    const [countResult] = await db
      .select({ total: count() })
      .from(users)
      .where(and(...whereConditions));

    // Get employees with enrollment status
    const employees = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        department: users.department,
        isActive: users.isActive,
        lastActive: users.updatedAt,
        createdAt: users.createdAt,
        enrollmentCount: sql<number>`(
          SELECT COUNT(*) 
          FROM ${benefitEnrollments} 
          WHERE ${benefitEnrollments.userId} = ${users.id} 
          AND ${benefitEnrollments.status} = 'active'
        )`,
      })
      .from(users)
      .where(and(...whereConditions))
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    // Transform data to match frontend expectations
    const transformedEmployees = employees.map(emp => ({
      id: emp.id,
      name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email,
      email: emp.email,
      role: emp.role || 'employee',
      status: emp.isActive ? 'active' : 'inactive',
      department: emp.department,
      enrollmentStatus: emp.enrollmentCount > 0 ? 'enrolled' : 'not_enrolled',
      lastActive: emp.lastActive,
      createdAt: emp.createdAt,
    }));

    return NextResponse.json({
      employees: transformedEmployees,
      total: countResult?.total || 0,
      page,
      limit,
      hasMore: offset + limit < (countResult?.total || 0),
    });
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

// POST /api/company-admin/employees - Invite new employee
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to invite employees
    if (session.user.type !== 'company_admin' && session.user.type !== 'hr_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validated = inviteEmployeeSchema.parse(body);

    // Check if email already exists in company
    const existingUser = await db
      .select()
      .from(users)
      .where(and(
        eq(users.email, validated.email),
        eq(users.companyId, session.user.companyId)
      ))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'A user with this email already exists in your company' },
        { status: 400 }
      );
    }

    // Create the user with pending status
    const [newUser] = await db
      .insert(users)
      .values({
        email: validated.email,
        stackUserId: `pending_${Date.now()}_${validated.email}`, // Temporary ID until user signs up
        companyId: session.user.companyId,
        role: validated.role,
        department: validated.department,
        firstName: validated.firstName,
        lastName: validated.lastName,
        isActive: false, // Will be activated when they accept the invitation
      })
      .returning();

    // Send invitation email
    try {
      await emailService.sendEmployeeInvitation({
        email: validated.email,
        companyName: session.user.company?.name || 'Your Company',
        inviterName: `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim() || session.user.email,
        role: validated.role,
      });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the whole operation if email fails
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
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
}