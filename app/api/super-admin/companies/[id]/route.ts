import { type NextRequest, NextResponse } from 'next/server';
import {
  withPlatformAdmin,
} from '@/lib/auth/api-middleware';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { z } from 'zod';
import { updateCompanySchema } from '@/lib/validation/schemas';

const superAdminService = new SuperAdminService();

// PUT /api/super-admin/companies/[id] - Update a company
export const PUT = withPlatformAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const body = await request.json();
    const validated = updateCompanySchema.parse(body);
    const company = await superAdminService.updateCompany(params.id, validated);
    return NextResponse.json(company);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    );
  }
});

// DELETE /api/super-admin/companies/[id] - Delete a company
export const DELETE = withPlatformAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    await superAdminService.deleteCompany(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    );
  }
});
