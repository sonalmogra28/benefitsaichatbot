import { type NextRequest, NextResponse } from 'next/server';
import { getContainer } from '@/lib/azure/cosmos-db';
import { validateToken } from '@/lib/azure/token-validation';
import { USER_ROLES } from '@/lib/constants/roles';

// GET /api/companies - List companies (super admin only)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await validateToken(token);
      if (!decodedToken) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }

      // Check if user has super admin or platform admin role
      if (
        decodedToken.role !== USER_ROLES.SUPER_ADMIN &&
        decodedToken.role !== USER_ROLES.PLATFORM_ADMIN
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10);
    const startAfter = searchParams.get('startAfter');
    const status = searchParams.get('status');

    // Query companies from Cosmos DB
    const companiesContainer = await getContainer('Companies');
    let query = 'SELECT * FROM c';
    const parameters: any[] = [];

    // Apply filters
    if (status) {
      query += ' WHERE c.status = @status';
      parameters.push({ name: '@status', value: status });
    }

    // Add ordering and pagination
    query += ' ORDER BY c.createdAt DESC';
    query += ` OFFSET ${startAfter ? 1 : 0} LIMIT ${limit}`;

    const { resources: companies } = await companiesContainer.items
      .query({ query, parameters })
      .fetchAll();

    return NextResponse.json({
      companies,
      hasMore: companies.length === limit,
      lastDoc: companies[companies.length - 1]?.id || null,
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/companies - Create a new company (super admin only)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await validateToken(token);
      if (!decodedToken) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }

      // Check if user has super admin or platform admin role
      if (
        decodedToken.role !== USER_ROLES.SUPER_ADMIN &&
        decodedToken.role !== USER_ROLES.PLATFORM_ADMIN
      ) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
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
    } = body;

    // Validate required fields
    if (!name || !domain || !contactEmail) {
      return NextResponse.json(
        { error: 'Name, domain, and contact email are required' },
        { status: 400 },
      );
    }

    try {
      // Create company document in Cosmos DB
      const companiesContainer = await getContainer('Companies');
      const companyId = `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const companyData = {
        id: companyId,
        name,
        domain,
        industry: industry || null,
        size: size || null,
        contactEmail,
        contactName: contactName || null,
        settings: settings || {},
        status: 'active',
        employeeCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: decodedToken.oid,
      };

      await companiesContainer.items.create(companyData);

      // Log activity
      const activityContainer = await getContainer('ActivityLogs');
      await activityContainer.items.create({
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'company_created',
        message: `New company "${name}" created`,
        metadata: {
          companyId: companyId,
          createdBy: decodedToken.oid,
        },
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(companyData, { status: 201 });
    } catch (error: any) {
      console.error('Error creating company:', error);
      if (error.code === 'CONFLICT') {
        return NextResponse.json(
          { error: 'A company with this domain already exists' },
          { status: 400 },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in company creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}