// app/api/files/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { gcsFileStorage } from '@/lib/storage/gcs';
import { getSession } from '@/lib/auth/session';
import { adminDb } from '@/lib/firebase/admin';
import crypto from 'crypto';
import path from 'path';

// File validation configuration
const ALLOWED_FILE_TYPES = {
  // Documents
  'application/pdf': { ext: '.pdf', maxSize: 10 * 1024 * 1024 }, // 10MB
  'application/msword': { ext: '.doc', maxSize: 10 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: '.docx', maxSize: 10 * 1024 * 1024 },
  'application/vnd.ms-excel': { ext: '.xls', maxSize: 10 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { ext: '.xlsx', maxSize: 10 * 1024 * 1024 },
  // Images
  'image/jpeg': { ext: '.jpg', maxSize: 5 * 1024 * 1024 }, // 5MB
  'image/png': { ext: '.png', maxSize: 5 * 1024 * 1024 },
  'image/gif': { ext: '.gif', maxSize: 2 * 1024 * 1024 },
  'image/webp': { ext: '.webp', maxSize: 5 * 1024 * 1024 },
  // Text
  'text/plain': { ext: '.txt', maxSize: 1 * 1024 * 1024 }, // 1MB
  'text/csv': { ext: '.csv', maxSize: 5 * 1024 * 1024 }
};

const MAX_FILENAME_LENGTH = 255;
const VIRUS_SIGNATURES = [
  // Common malware signatures (simplified for demonstration)
  Buffer.from('4D5A'), // PE executable
  Buffer.from('7F454C46'), // ELF executable
  Buffer.from('CAFEBABE'), // Java class file
];

/**
 * Sanitizes filename to prevent path traversal and other attacks
 */
function sanitizeFilename(filename: string): string {
  // Remove path components and null bytes
  const basename = path.basename(filename).replace(/\0/g, '');
  
  // Replace dangerous characters
  const sanitized = basename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '_')
    .substring(0, MAX_FILENAME_LENGTH);
  
  // Ensure filename is not empty
  return sanitized || 'unnamed_file';
}

/**
 * Basic virus scan by checking for known malicious signatures
 */
function scanForVirus(buffer: Buffer): boolean {
  for (const signature of VIRUS_SIGNATURES) {
    if (buffer.subarray(0, signature.length).equals(signature)) {
      return true; // Virus detected
    }
  }
  return false;
}

/**
 * Validates file content type by checking magic bytes
 */
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const magicBytes: Record<string, Buffer[]> = {
    'application/pdf': [Buffer.from('255044462D', 'hex')], // %PDF-
    'image/jpeg': [Buffer.from('FFD8FF', 'hex')],
    'image/png': [Buffer.from('89504E47', 'hex')],
    'image/gif': [Buffer.from('474946383761', 'hex'), Buffer.from('474946383961', 'hex')],
  };

  const signatures = magicBytes[mimeType];
  if (!signatures) return true; // Skip validation for types without magic bytes

  return signatures.some(sig => buffer.subarray(0, sig.length).equals(sig));
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const purpose = formData.get('purpose') as string || 'general';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const fileType = file.type.toLowerCase();
    const fileConfig = ALLOWED_FILE_TYPES[fileType as keyof typeof ALLOWED_FILE_TYPES];
    
    if (!fileConfig) {
      return NextResponse.json(
        { 
          error: 'File type not allowed',
          allowedTypes: Object.keys(ALLOWED_FILE_TYPES)
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > fileConfig.maxSize) {
      return NextResponse.json(
        { 
          error: `File size exceeds maximum allowed (${fileConfig.maxSize / 1024 / 1024}MB)`,
          fileSize: file.size,
          maxSize: fileConfig.maxSize
        },
        { status: 400 }
      );
    }

    // Convert file to buffer for scanning
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate magic bytes
    if (!validateMagicBytes(buffer, fileType)) {
      return NextResponse.json(
        { error: 'File content does not match declared type' },
        { status: 400 }
      );
    }

    // Scan for viruses
    if (scanForVirus(buffer)) {
      // Log security incident
      await adminDb.collection('security_incidents').add({
        type: 'malicious_file_upload',
        userId: session.uid,
        userEmail: session.email,
        fileName: file.name,
        fileType: file.type,
        timestamp: new Date().toISOString(),
        ip: req.headers.get('x-forwarded-for') || 'unknown'
      });

      return NextResponse.json(
        { error: 'File failed security scan' },
        { status: 400 }
      );
    }

    // Sanitize filename
    const sanitizedName = sanitizeFilename(file.name);
    
    // Generate unique file ID
    const fileId = crypto.randomBytes(16).toString('hex');
    
    // Create secure destination path
    const companyId = session.companyId || 'personal';
    const destination = `companies/${companyId}/documents/${session.uid}/${fileId}_${sanitizedName}`;

    // Upload to GCS with metadata
    const publicUrl = await gcsFileStorage.upload(destination, buffer);

    // Save file metadata to Firestore
    const fileDoc = {
      fileId,
      originalName: file.name,
      sanitizedName,
      path: destination,
      publicUrl,
      mimeType: file.type,
      size: file.size,
      purpose,
      uploadedBy: session.uid,
      uploadedByEmail: session.email,
      companyId,
      status: 'uploaded',
      scanned: true,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString()
    };

    await adminDb
      .collection('companies')
      .doc(companyId)
      .collection('documents')
      .doc(fileId)
      .set(fileDoc);

    // Log successful upload
    await adminDb.collection('audit_logs').add({
      action: 'file_upload',
      fileId,
      fileName: file.name,
      fileSize: file.size,
      userId: session.uid,
      userEmail: session.email,
      timestamp: new Date().toISOString(),
      ip: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return NextResponse.json({
      message: 'File uploaded successfully',
      fileId,
      path: destination,
      publicUrl,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    // Log error securely
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await adminDb.collection('error_logs').add({
      endpoint: '/api/files/upload',
      method: 'POST',
      error: errorMessage,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      { error: 'Failed to upload file. Please try again.' },
      { status: 500 }
    );
  }
}
