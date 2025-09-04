import { type NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin-middleware';
import { z } from 'zod';
import { updateUserSchema } from '@/lib/validation/schemas';
import { userService } from '@/lib/firebase/services/user.service';
import { isValidRole, type UserRole } from '@/lib/constants/roles';

// PUT /api/super-admin/users/[id] - Update a user
export const PUT = requireSuperAdmin(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const body = await request.json();
      const validated = updateUserSchema.parse(body);
      const { role, ...metadata } = validated;

      if (role) {
        await userService.updateUserRole(params.id, role as UserRole);
      }
      if (Object.keys(metadata).length > 0) {
        await userService.updateUserMetadata(params.id, metadata as any);
      }
      const updatedUser = await userService.getUserFromFirestore(params.id);
      return NextResponse.json(updatedUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.errors },
          { status: 400 },
        );
      }
      console.error('Error updating user:', error);
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 },
      );
    }
  },
);

// DELETE /api/super-admin/users/[id] - Delete a user
export const DELETE = requireSuperAdmin(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    try {
      await userService.deleteUser(params.id);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting user:', error);
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 },
      );
    }
  },
);

export const PATCH = requireSuperAdmin(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const body = await request.json();
      const schema = z.object({ type: z.string() });
      const { type } = schema.parse(body);
      if (!isValidRole(type)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }

      await userService.updateUserRole(params.id, type as UserRole);
      return NextResponse.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.errors },
          { status: 400 },
        );
      }
      console.error('Error updating user role:', error);
      return NextResponse.json(
        { error: 'Failed to update user role' },
        { status: 500 },
      );
    }
  },
);
