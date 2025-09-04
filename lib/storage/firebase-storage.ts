import { adminStorage } from '@/lib/firebase/admin';
import { customAlphabet } from 'nanoid';

// Generate URL-safe IDs
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10);

/**
 * Upload a document to Firebase Storage
 */
export async function uploadDocument(
  file: File | Buffer,
  companyId: string,
  metadata?: Record<string, string>
) {
  // Validate file type
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/msword'
  ];
  
  // Get file info
  const fileName = file instanceof File ? file.name : (metadata?.originalName || 'document');
  const fileType = file instanceof File ? file.type : (metadata?.contentType || 'application/octet-stream');
  const fileSize = file instanceof File ? file.size : Buffer.byteLength(file as Buffer);
  
  if (!allowedTypes.includes(fileType)) {
    throw new Error(`File type ${fileType} is not allowed`);
  }
  
  // Validate file size (max 50MB)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (fileSize > maxSize) {
    throw new Error('File size exceeds 50MB limit');
  }
  
  // Generate unique filename
  const fileId = nanoid();
  const extension = fileName.split('.').pop();
  const storedFileName = `${fileId}.${extension}`;
  const filePath = `companies/${companyId}/documents/${storedFileName}`;
  
  try {
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(filePath);
    
    // Convert File to Buffer if needed
    let buffer: Buffer;
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = file as Buffer;
    }
    
    // Upload file
    await fileRef.save(buffer, {
      metadata: {
        contentType: fileType,
        metadata: {
          ...metadata,
          originalName: fileName,
          companyId,
          uploadedAt: new Date().toISOString(),
          fileId
        }
      }
    });
    
    // Make file publicly accessible (optional - remove if you want private files)
    await fileRef.makePublic();
    
    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    
    return {
      url: publicUrl,
      pathname: filePath,
      size: fileSize,
      uploadedAt: new Date(),
      fileId,
      originalName: fileName,
    };
  } catch (error) {
    console.error('Firebase Storage upload error:', error);
    throw new Error('Failed to upload document');
  }
}

/**
 * Delete a document from Firebase Storage
 */
export async function deleteDocument(pathname: string) {
  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file(pathname);
    await file.delete();
    return true;
  } catch (error) {
    console.error('Firebase Storage delete error:', error);
    return false;
  }
}

/**
 * List documents for a company
 */
export async function listCompanyDocuments(companyId: string) {
  try {
    const bucket = adminStorage.bucket();
    const [files] = await bucket.getFiles({
      prefix: `companies/${companyId}/documents/`,
    });
    
    const documents = await Promise.all(
      files.map(async (file) => {
        const [metadata] = await file.getMetadata();
        return {
          url: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
          pathname: file.name,
          size: Number.parseInt(String(metadata.size || '0')),
          uploadedAt: new Date(metadata.updated || metadata.timeCreated || Date.now()),
          metadata: metadata.metadata || {},
        };
      })
    );
    
    return documents;
  } catch (error) {
    console.error('Firebase Storage list error:', error);
    return [];
  }
}

/**
 * Get document metadata
 */
export async function getDocumentMetadata(pathname: string) {
  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file(pathname);
    const [metadata] = await file.getMetadata();
    
    return {
      size: Number.parseInt(String(metadata.size || '0')),
      contentType: metadata.contentType,
      uploadedAt: new Date(metadata.updated || metadata.timeCreated || Date.now()),
      metadata: metadata.metadata || {},
    };
  } catch (error) {
    console.error('Firebase Storage metadata error:', error);
    return null;
  }
}

/**
 * Get a signed URL for temporary access to a private file
 */
export async function getSignedUrl(pathname: string, expiresInMinutes = 60) {
  try {
    const bucket = adminStorage.bucket();
    const file = bucket.file(pathname);
    
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });
    
    return signedUrl;
  } catch (error) {
    console.error('Firebase Storage signed URL error:', error);
    return null;
  }
}

/**
 * Validate file before upload
 */
export function validateFile(file: File) {
  const errors: string[] = [];
  
  // Check file type
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/msword'
  ];
  
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed. Allowed types: PDF, DOCX, DOC, TXT`);
  }
  
  // Check file size
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    errors.push(`File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds 50MB limit`);
  }
  
  // Check filename
  if (!file.name || file.name.length > 255) {
    errors.push('Invalid filename');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}