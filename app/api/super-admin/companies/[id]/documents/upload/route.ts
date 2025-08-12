// app/api/super-admin/companies/[id]/documents/upload/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { auth } from '@/app/(auth)/stack-auth';
import { getUser } from '@/lib/db/queries';

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME as string;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getUser({ id: session.user.id });

  if (user?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
}
