// app/api/super-admin/documents/upload/route.ts
import { NextResponse } from 'next/server';
import { getStorage, GetSignedUrlConfig } from 'firebase-admin/storage';
import { initializeApp, getApps } from 'firebase-admin/app';

// Initialize Firebase Admin SDK if not already initialized
if (!getApps().length) {
  initializeApp();
}

const storage = getStorage();

export async function POST(request: Request) {
  try {
    const { fileName, contentType } = await request.json();

    if (!fileName || !contentType) {
      return NextResponse.json({ error: 'fileName and contentType are required' }, { status: 400 });
    }

    const bucket = storage.bucket();
    const file = bucket.file(`documents/${fileName}`);

    // Explicitly define the type for the options object
    const options: GetSignedUrlConfig = {
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType,
    };

    const [url] = await file.getSignedUrl(options);

    return NextResponse.json({ url }, { status: 200 });
  } catch (error) {
    console.error('Error creating signed URL:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
