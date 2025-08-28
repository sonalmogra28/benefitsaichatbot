// app/api/super-admin/companies/[id]/documents/upload/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { requireSuperAdmin } from '@/lib/auth/admin-middleware';

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME as string;

export const POST = requireSuperAdmin(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const formData = await request.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const bucket = storage.bucket(bucketName);
  const blob = bucket.file(`${params.id}/${file.name}`);
  const blobStream = blob.createWriteStream();

  const fileBuffer = await file.arrayBuffer();
  blobStream.end(Buffer.from(fileBuffer));

  return new Promise((resolve, reject) => {
    blobStream.on('finish', () => {
      resolve(NextResponse.json({ success: true }));
    });
    blobStream.on('error', (err) => {
      reject(NextResponse.json({ error: err.message }, { status: 500 }));
    });
  });
});
