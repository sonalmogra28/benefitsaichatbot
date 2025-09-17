import { type NextRequest, NextResponse } from 'next/server';
import { getContainer, USERS_CONTAINER } from '@/lib/azure/cosmos-db';
import { validateToken } from '@/lib/azure/token-validation';
import { USER_ROLES } from '@/lib/constants/roles';

// GET /api/users - List users
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = Number.parseInt(searchParams.get('limit') || '20', 10);
    const startAfter = searchParams.get('startAfter');
    const companyId = searchParams.get('companyId');
    const role = searchParams.get('role');
    const status = searchParams.get('status');

    // Check permissions
    const isSuperAdmin =
      decodedToken.role === USER_ROLES.SUPER_ADMIN ||
      decodedToken.role === USER_ROLES.PLATFORM_ADMIN;
    const isCompanyAdmin = decodedToken.role === USER_ROLES.COMPANY_ADMIN;
    const isHRAdmin = decodedToken.role === USER_ROLES.HR_ADMIN;

    // Build query based on permissions
    const usersContainer = await getContainer(USERS_CONTAINER);
    let query = 'SELECT * FROM c';
    const parameters: any[] = [];

    // If not super admin, restrict to their company
    if (!isSuperAdmin) {
      if (isCompanyAdmin || isHRAdmin) {
        query += ' WHERE c.companyId = @companyId';
        parameters.push({ name: '@companyId', value: decodedToken.companyId });
      } else {
        // Regular employees can only see themselves
        query += ' WHERE c.oid = @oid';
        parameters.push({ name: '@oid', value: decodedToken.oid });
      }
    } else if (companyId) {
      // Super admin filtering by company
      query += ' WHERE c.companyId = @companyId';
      parameters.push({ name: '@companyId', value: companyId });
    }

    // Apply filters
    if (role) {
      query += query.includes('WHERE') ? ' AND c.role = @role' : ' WHERE c.role = @role';
      parameters.push({ name: '@role', value: role });
    }

    if (status) {
      query += query.includes('WHERE') ? ' AND c.status = @status' : ' WHERE c.status = @status';
      parameters.push({ name: '@status', value: status });
    }

    // Add ordering and pagination
    query += ' ORDER BY c.createdAt DESC';
    query += ` OFFSET ${startAfter ? 1 : 0} LIMIT ${limit}`;

    // Execute query
    const { resources: users } = await usersContainer.items
      .query({ query, parameters })
      .fetchAll();

    // Remove sensitive data
    const sanitizedUsers = users.map((user: any) => {
      const { passwordHash, ...userData } = user;
      return {
        id: user.id,
        ...userData,
        createdAt: userData.createdAt || null,
        updatedAt: userData.updatedAt || null,
      };
    });

    return NextResponse.json({
      users: sanitizedUsers,
      hasMore: users.length === limit,
      lastDoc: users[users.length - 1]?.id || null,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
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

    // Check permissions - only admins can create users
    const isSuperAdmin =
      decodedToken.role === USER_ROLES.SUPER_ADMIN ||
      decodedToken.role === USER_ROLES.PLATFORM_ADMIN;
    const isCompanyAdmin = decodedToken.role === USER_ROLES.COMPANY_ADMIN;
    const isHRAdmin = decodedToken.role === USER_ROLES.HR_ADMIN;

    if (!isSuperAdmin && !isCompanyAdmin && !isHRAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const {
      email,
      displayName,
      role,
      companyId: requestCompanyId,
    } = body;

    // Validate required fields
    if (!email || !displayName) {
      return NextResponse.json(
        { error: 'Email and display name are required' },
        { status: 400 },
      );
    }

    // Determine company ID
    let targetCompanyId = requestCompanyId;
    if (!isSuperAdmin) {
      // Company/HR admins can only create users in their company
      targetCompanyId = decodedToken.companyId;
    }

    // Validate role assignment
    const targetRole = role || USER_ROLES.EMPLOYEE;
    if (!isSuperAdmin) {
      // Company admins can't create super admins or platform admins
      if (
        targetRole === USER_ROLES.SUPER_ADMIN ||
        targetRole === USER_ROLES.PLATFORM_ADMIN
      ) {
        return NextResponse.json(
          { error: 'Insufficient permissions to assign this role' },
          { status: 403 },
        );
      }
    }

    try {
      // Create user document in Cosmos DB
      const usersContainer = await getContainer(USERS_CONTAINER);
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const userData = {
        id: userId,
        oid: userId, // Azure AD object ID
        email,
        displayName,
        role: targetRole,
        companyId: targetCompanyId || null,
        emailVerified: false,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: decodedToken.oid,
      };

      await usersContainer.items.create(userData);

      // Log activity
      const activityContainer = await getContainer('ActivityLogs');
      await activityContainer.items.create({
        id: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'user_created',
        message: `New user "${displayName}" created`,
        metadata: {
          userId: userId,
          role: targetRole,
          companyId: targetCompanyId,
          createdBy: decodedToken.oid,
        },
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          ...userData,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        { status: 201 },
      );
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.code === 'CONFLICT') {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 400 },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in user creation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}