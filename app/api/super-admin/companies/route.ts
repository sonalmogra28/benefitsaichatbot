import { type NextRequest, NextResponse } from 'next/server';
import { withPlatformAdmin } from '@/lib/auth/api-middleware';
import { SuperAdminService } from '@/lib/services/super-admin.service';
import { z } from 'zod';

const createCompanySchema = z.object({
  name: z.string().min(1).max(100),
  domain: z.string().optional(),
  maxUsers: z.number().optional(),
  features: z.array(z.string()).default([]),
  billingPlan: z.enum(['free', 'starter', 'professional', 'enterprise']).default('starter'),
  adminEmail: z.string().email(),
});

const superAdminService = new SuperAdminService();

// GET /api/super-admin/companies - List all companies
export const GET = withPlatformAdmin(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = Number.parseInt(searchParams.get('page') || '1');
  const limit = Number.parseInt(searchParams.get('limit') || '20');
  const includeDeleted = searchParams.get('includeDeleted') === 'true';

  try {
    const result = await superAdminService.listCompanies(page, limit, includeDeleted);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error listing companies:', error);
    return NextResponse.json(
      { error: 'Failed to list companies' },
      { status: 500 }
    );
  }
});

// POST /api/super-admin/companies - Create new company
export const POST = withPlatformAdmin(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const validated = createCompanySchema.parse(body);
    
    const company = await superAdminService.createCompany(validated);
    
    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Error creating company:', error);
    return NextResponse.json(
      { error: 'Failed to create company' },
      { status: 500 }
    );
  }
});