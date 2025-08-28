import { type NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/admin-middleware';
import { USER_ROLES } from '@/lib/constants/roles';
import { documentService, documentSchema } from '@/lib/firebase/services/document.service';
import { uploadDocument, validateFile } from '@/lib/storage/firebase-storage';
import { z } from 'zod';

// Schema for upload metadata
const uploadMetadataSchema = documentSchema.pick({
  title: true,
  documentType: true,
  category: true,
  tags: true,
});

export const POST = withAuth(USER_ROLES.COMPANY_ADMIN, async (
  request: NextRequest,
  { params }: { params: { companyId: string } },
  user
) => {
  try {
    const { companyId } = params;
    
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadata = formData.get('metadata') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      return NextResponse.json({ 
        error: 'File validation failed', 
        details: validation.errors 
      }, { status: 400 });
    }
    
    // Parse and validate metadata
    let parsedMetadata: z.infer<typeof uploadMetadataSchema>;
    try {
      parsedMetadata = uploadMetadataSchema.parse(JSON.parse(metadata));
    } catch (error) {
      return NextResponse.json({ 
        error: 'Invalid metadata',
        details: error instanceof z.ZodError ? error.errors : 'Invalid JSON'
      }, { status: 400 });
    }
    
    // Upload to Vercel Blob
    const uploadResult = await uploadDocument(file, companyId, {
      uploadedBy: user.uid,
      documentType: parsedMetadata.documentType,
    });
    
    // Create database record
    const documentId = await documentService.createDocument(companyId, {
      ...parsedMetadata,
      fileUrl: uploadResult.url,
      fileType: file.type,
      isPublic: false,
    }, user.uid);
    
    // TODO: Queue document processing job
    // For now, we'll return success and process can be triggered separately
    
    return NextResponse.json({
      success: true,
      document: {
        id: documentId,
        title: parsedMetadata.title,
        fileUrl: uploadResult.url,
        status: 'pending_processing',
      },
    });
    
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
});

// Get list of documents for a company
export const GET = withAuth(USER_ROLES.COMPANY_ADMIN, async (
  request: NextRequest,
  { params }: { params: { companyId: string } },
  user
) => {
  try {
    const { companyId } = params;
    
    const documents = await documentService.listDocuments(companyId);
    
    return NextResponse.json({
      documents: documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        documentType: doc.documentType,
        category: doc.category,
        tags: doc.tags,
        fileUrl: doc.fileUrl,
        fileType: doc.fileType,
        processedAt: doc.processedAt,
        createdAt: doc.createdAt,
        status: doc.status,
      })),
    });
    
  } catch (error) {
    console.error('Document list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
});
