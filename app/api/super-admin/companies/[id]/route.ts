import { type NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/admin-middleware';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { logger } from '@/lib/logger';
import { z } from 'zod';
import { updateCompanySchema } from '@/lib/validation/schemas';

const superAdminService = new SuperAdminService();

// PUT /api/super-admin/companies/[id] - Update a company
export const PUT = requireSuperAdmin(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const body = await request.json();
      const validated = updateCompanySchema.parse(body);
      const company = await superAdminService.updateCompany(params.id, validated);
      return NextResponse.json({
        message: 'Company updated successfully',
        company
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.errors },
          { status: 400 },
        );
      }
      logger.error('Error updating company:', error);
      return NextResponse.json(
        { error: 'Failed to update company' },
        { status: 500 },
      );
    }
  },
);

// DELETE /api/super-admin/companies/[id] - Delete a company
export const DELETE = requireSuperAdmin(
  async (request: NextRequest, { params }: { params: { id: string } }) => {
    try {
      await superAdminService.deleteCompany(params.id);
      return NextResponse.json({
        message: 'Company and all associated data deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting company:', error);
      return NextResponse.json(
        { error: 'Failed to delete company' },
        { status: 500 },
      );
    }
  },
);
