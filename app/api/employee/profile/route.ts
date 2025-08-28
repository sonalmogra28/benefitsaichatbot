import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/admin-middleware';
import { USER_ROLES } from '@/lib/constants/roles';
import { userService, userMetadataSchema } from '@/lib/firebase/services/user.service';
import { z } from 'zod';

const updateProfileSchema = userMetadataSchema.pick({
  department: true,
  hireDate: true,
});

// GET /api/employee/profile - Get employee profile
export const GET = withAuth(USER_ROLES.EMPLOYEE, async (request: NextRequest, context, user) => {
  try {
    const profile = await userService.getUserFromFirestore(user.uid);

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
});

// PATCH /api/employee/profile - Update employee profile
export const PATCH = withAuth(USER_ROLES.EMPLOYEE, async (request: NextRequest, context, user) => {
  try {
    const body = await request.json();
    const validated = updateProfileSchema.parse(body);

    await userService.updateUserMetadata(user.uid, validated);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
});
