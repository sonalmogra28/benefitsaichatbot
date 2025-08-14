import { type NextRequest, NextResponse } from 'next/server';
import { withPlatformAdmin } from '@/lib/auth/api-middleware';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { z } from 'zod';
import { createUserSchema } from '@/lib/validation/schemas';

const bulkCreateSchema = z.object({
  users: z.array(createUserSchema),
  sendInvites: z.boolean().default(true),
});

const superAdminService = new SuperAdminService();

// GET /api/super-admin/users - List all users across all companies
export const GET = withPlatformAdmin(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number.parseInt(searchParams.get('page') || '1');
  const limit = Number.parseInt(searchParams.get('limit') || '50');
  const companyId = searchParams.get('companyId') || undefined;

  try {
    const result = await superAdminService.listAllUsers(page, limit, companyId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing users:', error);
    return NextResponse.json(
      { error: 'Failed to list users' },
      { status: 500 }
    );
  }
});

// POST /api/super-admin/users - Bulk create users
export const POST = withPlatformAdmin(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validated = bulkCreateSchema.parse(body);
    
    const users = await superAdminService.createBulkUsers(validated);
    
    return NextResponse.json({ users, count: users.length }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating users:', error);
    return NextResponse.json(
      { error: 'Failed to create users' },
      { status: 500 }
    );
  }
});