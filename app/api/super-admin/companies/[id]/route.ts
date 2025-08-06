import { type NextRequest, NextResponse } from 'next/server';
import { withPlatformAdmin } from '@/lib/auth/api-middleware';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { z } from 'zod';

const updateCompanySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  domain: z.string().optional(),
  maxUsers: z.number().optional(),
  features: z.array(z.string()).optional(),
  billingPlan: z.enum(['free', 'starter', 'professional', 'enterprise']).optional(),
  isActive: z.boolean().optional(),
});

const superAdminService = new SuperAdminService();

// GET /api/super-admin/companies/[id] - Get company details with stats
export const GET = withPlatformAdmin(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  try {
    const company = await superAdminService.getCompanyWithStats(id);
    return NextResponse.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company' },
      { status: 500 }
    );
  }
});

// PATCH /api/super-admin/companies/[id] - Update company
export const PATCH = withPlatformAdmin(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  try {
    const body = await request.json();
    const validated = updateCompanySchema.parse(body);
    
    const company = await superAdminService.updateCompany(id, validated);
    
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

// DELETE /api/super-admin/companies/[id] - Delete company
export const DELETE = withPlatformAdmin(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  try {
    await superAdminService.deleteCompany(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    );
  }
});