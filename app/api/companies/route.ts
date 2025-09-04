import { type NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
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
      const decodedToken = await adminAuth.verifyIdToken(token);
      
      // Check if user has super admin or platform admin role
      if (decodedToken.role !== USER_ROLES.SUPER_ADMIN && decodedToken.role !== USER_ROLES.PLATFORM_ADMIN) {
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
    const status = searchParams.get('status'); // active, suspended, inactive

    // Build query
    let query = adminDb.collection('companies').orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    if (startAfter) {
      const startDoc = await adminDb.collection('companies').doc(startAfter).get();
      if (startDoc.exists) {
        query = query.startAfter(startDoc);
      }
    }

    query = query.limit(limit);

    // Execute query
    const snapshot = await query.get();
    
    const companies = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || null,
      updatedAt: doc.data().updatedAt?.toDate?.() || null,
    }));

    return NextResponse.json({
      companies,
      hasMore: snapshot.size === limit,
      lastDoc: snapshot.docs[snapshot.docs.length - 1]?.id || null,
    });
  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
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
      const decodedToken = await adminAuth.verifyIdToken(token);
      
      // Check if user has super admin role
      if (decodedToken.role !== USER_ROLES.SUPER_ADMIN && decodedToken.role !== USER_ROLES.PLATFORM_ADMIN) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { name, domain, adminEmail, employeeLimit, settings } = body;

    // Validate required fields
    if (!name || !adminEmail) {
      return NextResponse.json(
        { error: 'Name and admin email are required' },
        { status: 400 }
      );
    }

    // Check if company with same domain already exists
    if (domain) {
      const existingCompany = await adminDb
        .collection('companies')
        .where('domain', '==', domain)
        .limit(1)
        .get();
      
      if (!existingCompany.empty) {
        return NextResponse.json(
          { error: 'A company with this domain already exists' },
          { status: 400 }
        );
      }
    }

    // Create company document
    const companyRef = adminDb.collection('companies').doc();
    const companyData = {
      id: companyRef.id,
      name,
      domain: domain || null,
      adminEmail,
      employeeLimit: employeeLimit || 1000,
      status: 'active',
      employeeCount: 0,
      planCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      settings: {
        allowSelfRegistration: settings?.allowSelfRegistration || false,
        requireEmailVerification: settings?.requireEmailVerification !== false,
        defaultRole: settings?.defaultRole || 'employee',
        ...settings,
      },
    };

    await companyRef.set(companyData);

    // Log activity
    const activityRef = adminDb.collection('activity_logs').doc();
    await activityRef.set({
      id: activityRef.id,
      type: 'company_added',
      message: `New company \"${name}\" created`,
      metadata: { companyId: companyRef.id },
      timestamp: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      { 
        ...companyData,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}