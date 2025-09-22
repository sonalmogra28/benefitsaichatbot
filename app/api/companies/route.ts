import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { companyService } from '@/lib/services/company-service';
import { logger } from '@/lib/logger';

export const GET = withAdminAuth(async (request: AuthenticatedRequest) => {
  let decodedToken: any = null;

  try {
    // decodedToken is already available in request.user from middleware
    decodedToken = request.user;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const companies = await companyService.getCompanies({
      page,
      limit,
      adminId: decodedToken.id
    });

    return NextResponse.json({ companies });

  } catch (error) {
    logger.error('Error fetching companies', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      adminId: decodedToken?.id 
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});

export const POST = withAdminAuth(async (request: AuthenticatedRequest) => {
  let decodedToken: any = null;

  try {
    decodedToken = request.user;
    const body = await request.json();

    const company = await companyService.createCompany({
      ...body,
      createdBy: decodedToken.id
    });

    return NextResponse.json({ company }, { status: 201 });

  } catch (error) {
    logger.error('Error creating company', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      adminId: decodedToken?.id 
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});