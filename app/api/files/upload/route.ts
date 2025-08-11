// app/api/files/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { gcsFileStorage } from '@/lib/storage/gcs';
import { getSession } from '@/lib/auth/session'; // Assuming you have a session utility

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(); // Protect the endpoint
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create a unique destination path
    const destination = `documents/user_${session.user.id}/${Date.now()}_${file.name}`;

    // Upload to GCS
    const publicUrl = await gcsFileStorage.upload(destination, buffer);

    // You might want to save the file metadata (destination, original name, etc.)
    // to your database here.

    return NextResponse.json({
      message: 'File uploaded successfully.',
      path: destination,
      publicUrl,
    });
  } catch (error) {
    console.error('File upload error:', error);
    // Use a structured logger in a real app
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
