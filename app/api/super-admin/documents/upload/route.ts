import { type NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (decodedToken.super_admin !== true) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { fileName, fileType, downloadURL, storagePath } =
      await request.json();

    const docRef = await adminDb.collection('documents').add({
      userId: decodedToken.uid,
      title: fileName,
      fileName,
      fileType,
      storagePath,
      downloadURL,
      status: 'uploaded',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      id: docRef.id,
      message: 'Document created successfully',
    });
  } catch (error) {
    console.error('Error creating document in Firestore:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
