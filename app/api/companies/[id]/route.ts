import { type NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/lib/azure/cosmos-db';
import { validateToken } from '@/lib/azure/token-validation';
import { USER_ROLES } from '@/lib/constants/roles';

// GET /api/companies/[id] - Get a specific company
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken: any;

    try {
      decodedToken = await validateToken(token);
      if (!decodedToken) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const companyId = id;

    // Check permissions
    const isSuperAdmin =
      decodedToken.role === USER_ROLES.SUPER_ADMIN ||
      decodedToken.role === USER_ROLES.PLATFORM_ADMIN;
    const isCompanyAdmin = decodedToken.role === USER_ROLES.COMPANY_ADMIN;
    const isHRAdmin = decodedToken.role === USER_ROLES.HR_ADMIN;

    // If not super admin, can only access their own company
    if (!isSuperAdmin) {
      if (decodedToken.companyId !== companyId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Get company from Cosmos DB
    const companiesContainer = await getContainer('Companies');
    const { resource: company } = await companiesContainer.item(companyId).read();

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PUT /api/companies/[id] - Update a company
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken: any;

    try {
      decodedToken = await validateToken(token);
      if (!decodedToken) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const companyId = id;

    // Check permissions
    const isSuperAdmin =
      decodedToken.role === USER_ROLES.SUPER_ADMIN ||
      decodedToken.role === USER_ROLES.PLATFORM_ADMIN;
    const isCompanyAdmin = decodedToken.role === USER_ROLES.COMPANY_ADMIN;
    const isHRAdmin = decodedToken.role === USER_ROLES.HR_ADMIN;

    // If not super admin, can only update their own company
    if (!isSuperAdmin) {
      if (decodedToken.companyId !== companyId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Parse request body
    const body = await request.json();
    const {
      name,
      domain,
      industry,
      size,
      contactEmail,
      contactName,
      settings,
      status,
    } = body;

    // Get existing company
    const companiesContainer = await getContainer('Companies');
    const { resource: existingCompany } = await companiesContainer.item(companyId).read();

    if (!existingCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Update company data
    const updatedCompany = {
      ...existingCompany,
      ...(name && { name }),
      ...(domain && { domain }),
      ...(industry !== undefined && { industry }),
      ...(size !== undefined && { size }),
      ...(contactEmail && { contactEmail }),
      ...(contactName !== undefined && { contactName }),
      ...(settings && { settings: { ...existingCompany.settings, ...settings } }),
      ...(status && { status }),
      updatedAt: new Date().toISOString(),
      updatedBy: decodedToken.oid,
    };

    await companiesContainer.item(companyId).replace(updatedCompany);

    // Log activity
    const activityContainer = await getContainer('ActivityLogs');
    await activityContainer.items.create({
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'company_updated',
      message: `Company "${name || existingCompany.name}" updated`,
      metadata: {
        companyId: companyId,
        updatedBy: decodedToken.oid,
      },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(updatedCompany);
  } catch (error) {
    console.error('Error updating company:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE /api/companies/[id] - Delete a company (super admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken: any;

    try {
      decodedToken = await validateToken(token);
      if (!decodedToken) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only super admins can delete companies
    if (
      decodedToken.role !== USER_ROLES.SUPER_ADMIN &&
      decodedToken.role !== USER_ROLES.PLATFORM_ADMIN
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const companyId = id;

    // Get existing company
    const companiesContainer = await getContainer('Companies');
    const { resource: existingCompany } = await companiesContainer.item(companyId).read();

    if (!existingCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Soft delete - mark as deleted
    const deletedCompany = {
      ...existingCompany,
      status: 'deleted',
      deletedAt: new Date().toISOString(),
      deletedBy: decodedToken.oid,
    };

    await companiesContainer.item(companyId).replace(deletedCompany);

    // Log activity
    const activityContainer = await getContainer('ActivityLogs');
    await activityContainer.items.create({
      id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'company_deleted',
      message: `Company "${existingCompany.name}" deleted`,
      metadata: {
        companyId: companyId,
        deletedBy: decodedToken.oid,
      },
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}