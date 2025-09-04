import { type NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { USER_ROLES } from '@/lib/constants/roles';

// GET /api/companies/[id] - Get a specific company
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const companyId = params.id;

    // Check permissions
    const isSuperAdmin =
      decodedToken.role === USER_ROLES.SUPER_ADMIN ||
      decodedToken.role === USER_ROLES.PLATFORM_ADMIN;
    const isCompanyAdmin =
      decodedToken.role === USER_ROLES.COMPANY_ADMIN &&
      decodedToken.companyId === companyId;
    const isHRAdmin =
      decodedToken.role === USER_ROLES.HR_ADMIN &&
      decodedToken.companyId === companyId;

    if (!isSuperAdmin && !isCompanyAdmin && !isHRAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch company
    const companyDoc = await adminDb
      .collection('companies')
      .doc(companyId)
      .get();

    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const companyData = companyDoc.data();

    return NextResponse.json({
      id: companyDoc.id,
      ...companyData,
      createdAt: companyData?.createdAt?.toDate?.() || null,
      updatedAt: companyData?.updatedAt?.toDate?.() || null,
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// PATCH /api/companies/[id] - Update a company
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const companyId = params.id;

    // Check permissions - only super admin and company admin can update
    const isSuperAdmin =
      decodedToken.role === USER_ROLES.SUPER_ADMIN ||
      decodedToken.role === USER_ROLES.PLATFORM_ADMIN;
    const isCompanyAdmin =
      decodedToken.role === USER_ROLES.COMPANY_ADMIN &&
      decodedToken.companyId === companyId;

    if (!isSuperAdmin && !isCompanyAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();

    // Prepare update data
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Fields that can be updated
    const allowedFields = ['name', 'domain', 'employeeLimit', 'settings'];

    // Super admin can also update status
    if (isSuperAdmin && body.status) {
      updateData.status = body.status;
    }

    // Add allowed fields to update
    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });

    // Check if company exists
    const companyRef = adminDb.collection('companies').doc(companyId);
    const companyDoc = await companyRef.get();

    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Update company
    await companyRef.update(updateData);

    // Log activity
    const activityRef = adminDb.collection('activity_logs').doc();
    await activityRef.set({
      id: activityRef.id,
      type: 'company_updated',
      message: `Company \"${companyDoc.data()?.name}\" updated`,
      metadata: {
        companyId,
        updatedBy: decodedToken.uid,
        changes: Object.keys(updateData).filter((key) => key !== 'updatedAt'),
      },
      timestamp: FieldValue.serverTimestamp(),
    });

    // Fetch updated company
    const updatedDoc = await companyRef.get();
    const updatedData = updatedDoc.data();

    return NextResponse.json({
      id: updatedDoc.id,
      ...updatedData,
      createdAt: updatedData?.createdAt?.toDate?.() || null,
      updatedAt: updatedData?.updatedAt?.toDate?.() || null,
    });
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
  { params }: { params: { id: string } },
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);

      // Check if user has super admin role
      if (decodedToken.role !== USER_ROLES.SUPER_ADMIN) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const companyId = params.id;

    // Check if company exists
    const companyRef = adminDb.collection('companies').doc(companyId);
    const companyDoc = await companyRef.get();

    if (!companyDoc.exists) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const companyName = companyDoc.data()?.name;

    // Soft delete by updating status
    await companyRef.update({
      status: 'deleted',
      deletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Log activity
    const activityRef = adminDb.collection('activity_logs').doc();
    await activityRef.set({
      id: activityRef.id,
      type: 'company_deleted',
      message: `Company \"${companyName}\" deleted`,
      metadata: { companyId },
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      { message: 'Company deleted successfully' },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
