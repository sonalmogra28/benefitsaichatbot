import { type NextRequest, NextResponse } from 'next/server';
import {
  requireSuperAdmin,
} from '@/lib/auth/admin-middleware';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { z } from 'zod';
import { updateUserSchema } from '@/lib/validation/schemas';

const superAdminService = new SuperAdminService();

// PUT /api/super-admin/users/[id] - Update a user
export const PUT = requireSuperAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const body = await request.json();
    const validated = updateUserSchema.parse(body);
    const updatedUser = await superAdminService.updateUser(params.id, validated);
    return NextResponse.json(updatedUser);
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

// DELETE /api/super-admin/users/[id] - Delete a user
export const DELETE = requireSuperAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    await superAdminService.deleteUser(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
});
