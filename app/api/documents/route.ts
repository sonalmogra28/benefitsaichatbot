import { type NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET(req: NextRequest) {
  try {
    // Get auth token from headers
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Get company ID from user's custom claims
    const userRecord = await adminAuth.getUser(decodedToken.uid);
    const companyId = userRecord.customClaims?.companyId;

    if (!companyId) {
      return NextResponse.json(
        { error: 'No company assigned' },
        { status: 403 },
      );
    }

    // Fetch documents
    const snapshot = await adminDb
      .collection('companies')
      .doc(companyId)
      .collection('documents')
      .get();

    const documents = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get auth token from headers
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    // Get company ID from user's custom claims
    const userRecord = await adminAuth.getUser(decodedToken.uid);
    const companyId = userRecord.customClaims?.companyId;

    if (!companyId) {
      return NextResponse.json(
        { error: 'No company assigned' },
        { status: 403 },
      );
    }

    const body = await req.json();

    // Create document
    const documentRef = adminDb
      .collection('companies')
      .doc(companyId)
      .collection('documents')
      .doc();

    const documentData = {
      id: documentRef.id,
      companyId,
      ...body,
      createdBy: decodedToken.uid,
      status: 'pending_processing',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await documentRef.set(documentData);

    return NextResponse.json({
      id: documentRef.id,
      message: 'Document created successfully',
    });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 },
    );
  }
}
