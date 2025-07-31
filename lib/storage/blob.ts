import { put, del, list, head, } from '@vercel/blob';
import { customAlphabet } from 'nanoid';

// Generate URL-safe IDs
const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 10);

/**
 * Upload a document to Vercel Blob storage
 */
export async function uploadDocument(
  file: File,
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
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} is not allowed`);
  }
  
  // Validate file size (max 50MB)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    throw new Error('File size exceeds 50MB limit');
  }
  
  // Generate unique filename
  const fileId = nanoid();
  const extension = file.name.split('.').pop();
  const filename = `${fileId}.${extension}`;
  const pathname = `companies/${companyId}/documents/${filename}`;
  
  try {
    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: false,
    });
    
    // Get file metadata separately since PutBlobResult doesn't include size/uploadedAt
    const fileSize = file.size;
    const uploadedAt = new Date();
    
    return {
      url: blob.url,
      pathname: blob.pathname,
      size: fileSize,
      uploadedAt,
      fileId,
      originalName: file.name,
    };
  } catch (error) {
    console.error('Blob upload error:', error);
    throw new Error('Failed to upload document');
  }
}

/**
 * Delete a document from Vercel Blob storage
 */
export async function deleteDocument(url: string) {
  try {
    await del(url);
    return true;
  } catch (error) {
    console.error('Blob delete error:', error);
    return false;
  }
}

/**
 * List documents for a company
 */
export async function listCompanyDocuments(companyId: string) {
  try {
    const { blobs } = await list({
      prefix: `companies/${companyId}/documents/`,
    });
    
    return blobs.map(blob => ({
      url: blob.url,
      pathname: blob.pathname,
      size: blob.size,
      uploadedAt: blob.uploadedAt,
      metadata: {}, // Vercel Blob doesn't support metadata directly
    }));
  } catch (error) {
    console.error('Blob list error:', error);
    return [];
  }
}

/**
 * Get document metadata
 */
export async function getDocumentMetadata(url: string) {
  try {
    const metadata = await head(url);
    return metadata;
  } catch (error) {
    console.error('Blob head error:', error);
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