import { NextRequest, NextResponse } from 'next/server';
import { withPlatformAdmin } from '@/lib/auth/api-middleware';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { z } from 'zod';

const updateUserSchema = z.object({
  type: z.enum(['employee', 'hr_admin', 'company_admin', 'platform_admin']).optional(),
  suspend: z.boolean().optional(),
});

const superAdminService = new SuperAdminService();

// PATCH /api/super-admin/users/[id] - Update user role or suspend
export const PATCH = withPlatformAdmin(async (
  request: NextRequest,
  context
) => {
  const params = await (context as any).params;
  try {
    const body = await request.json();
    const validated = updateUserSchema.parse(body);
    
    if (validated.suspend) {
      await superAdminService.suspendUser(params.id);
      return NextResponse.json({ success: true, action: 'suspended' });
    }
    
    if (validated.type) {
      await superAdminService.updateUserRole(params.id, validated.type);
      return NextResponse.json({ success: true, action: 'role_updated' });
    }
    
    return NextResponse.json(
      { error: 'No valid action specified' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
});

// DELETE /api/super-admin/users/[id] - Permanently delete user
export const DELETE = withPlatformAdmin(async (
  request: NextRequest,
  context
) => {
  const params = await (context as any).params;
  try {
    await superAdminService.suspendUser(params.id); // Using suspend for soft delete
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
});