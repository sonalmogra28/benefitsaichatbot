import { type NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
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
      decodedToken = await adminAuth.verifyIdToken(token);
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
    let query = adminDb.collection('users').orderBy('createdAt', 'desc');

    // If not super admin, restrict to their company
    if (!isSuperAdmin) {
      if (isCompanyAdmin || isHRAdmin) {
        query = query.where('companyId', '==', decodedToken.companyId);
      } else {
        // Regular employees can only see themselves
        query = query.where('uid', '==', decodedToken.uid);
      }
    } else if (companyId) {
      // Super admin filtering by company
      query = query.where('companyId', '==', companyId);
    }

    // Apply filters
    if (role) {
      query = query.where('role', '==', role);
    }

    if (status) {
      query = query.where('status', '==', status);
    }

    // Pagination
    if (startAfter) {
      const startDoc = await adminDb.collection('users').doc(startAfter).get();
      if (startDoc.exists) {
        query = query.startAfter(startDoc);
      }
    }

    query = query.limit(limit);

    // Execute query
    const snapshot = await query.get();

    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      // Remove sensitive data
      const { passwordHash, ...userData } = data;
      return {
        id: doc.id,
        ...userData,
        createdAt: userData.createdAt?.toDate?.() || null,
        updatedAt: userData.updatedAt?.toDate?.() || null,
      };
    });

    return NextResponse.json({
      users,
      hasMore: snapshot.size === limit,
      lastDoc: snapshot.docs[snapshot.docs.length - 1]?.id || null,
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
      decodedToken = await adminAuth.verifyIdToken(token);
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
      password,
      displayName,
      role,
      companyId: requestCompanyId,
    } = body;

    // Validate required fields
    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: 'Email, password, and display name are required' },
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
      // Create Firebase Auth user
      const userRecord = await adminAuth.createUser({
        email,
        password,
        displayName,
        emailVerified: false,
      });

      // Set custom claims
      const customClaims: any = {
        role: targetRole,
      };

      if (targetCompanyId) {
        customClaims.companyId = targetCompanyId;
      }

      await adminAuth.setCustomUserClaims(userRecord.uid, customClaims);

      // Create user document in Firestore
      const userDocRef = adminDb.collection('users').doc(userRecord.uid);
      const userData = {
        uid: userRecord.uid,
        email,
        displayName,
        role: targetRole,
        companyId: targetCompanyId || null,
        emailVerified: false,
        status: 'active',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdBy: decodedToken.uid,
      };

      await userDocRef.set(userData);

      // If company user, add to company's users subcollection
      if (targetCompanyId) {
        const companyUserRef = adminDb
          .collection('companies')
          .doc(targetCompanyId)
          .collection('users')
          .doc(userRecord.uid);

        await companyUserRef.set({
          uid: userRecord.uid,
          email,
          displayName,
          role: targetRole,
          status: 'active',
          joinedAt: FieldValue.serverTimestamp(),
        });

        // Update employee count
        const companyRef = adminDb.collection('companies').doc(targetCompanyId);
        await companyRef.update({
          employeeCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      // Log activity
      const activityRef = adminDb.collection('activity_logs').doc();
      await activityRef.set({
        id: activityRef.id,
        type: 'user_created',
        message: `New user \"${displayName}\" created`,
        metadata: {
          userId: userRecord.uid,
          role: targetRole,
          companyId: targetCompanyId,
          createdBy: decodedToken.uid,
        },
        timestamp: FieldValue.serverTimestamp(),
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
      if (error.code === 'auth/email-already-exists') {
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
