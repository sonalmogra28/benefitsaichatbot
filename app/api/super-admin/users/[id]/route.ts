import { type NextRequest, NextResponse } from 'next/server';
import {
  withPlatformAdmin,
} from '@/lib/auth/api-middleware';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { z } from 'zod';
import { updateUserSchema } from '@/lib/validation/schemas';

const superAdminService = new SuperAdminService();

// PUT /api/super-admin/users/[id] - Update a user
export const PUT = withPlatformAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const body = await request.json();
    const validated = updateUserSchema.parse(body);
    // This is a simplified update. A more robust implementation would be in the SuperAdminService.
    const { db } = await import('@/lib/db');
    const { users } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');
    const [updatedUser] = await db.update(users).set(validated).where(eq(users.id, params.id)).returning();
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
export const DELETE = withPlatformAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    // This is a simplified delete. A more robust implementation would be in the SuperAdminService.
    const { db } = await import('@/lib/db');
    const { users } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');
    await db.delete(users).where(eq(users.id, params.id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
});
