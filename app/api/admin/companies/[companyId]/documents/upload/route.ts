import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/stack-auth';
import { db } from '@/lib/db';
import { knowledgeBaseDocuments } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { uploadDocument, validateFile } from '@/lib/storage/blob';
import { z } from 'zod';

// Schema for upload metadata
const uploadMetadataSchema = z.object({
  title: z.string().min(1).max(255),
  documentType: z.enum(['policy', 'guide', 'faq', 'form', 'other']),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  try {
    // Authenticate user
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user has admin rights
    if (session.user.type !== 'platform_admin' && 
        session.user.type !== 'company_admin' && 
        session.user.type !== 'hr_admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    // Verify user belongs to this company (unless platform admin)
    if (session.user.type !== 'platform_admin' && session.user.companyId !== companyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
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
      uploadedBy: session.user.id,
      documentType: parsedMetadata.documentType,
    });
    
    // Create database record
    const [document] = await db.insert(knowledgeBaseDocuments).values({
      companyId: companyId,
      title: parsedMetadata.title,
      content: '', // Will be populated by processing job
      documentType: parsedMetadata.documentType,
      category: parsedMetadata.category,
      tags: parsedMetadata.tags || [],
      fileUrl: uploadResult.url,
      fileType: file.type,
      createdBy: session.user.id,
      isPublic: false,
    }).returning();
    
    // TODO: Queue document processing job
    // For now, we'll return success and process can be triggered separately
    
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        fileUrl: document.fileUrl,
        status: 'pending_processing',
        uploadedAt: document.createdAt,
      },
    });
    
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

// Get list of documents for a company
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Verify access
    if (session.user.type !== 'platform_admin' && session.user.companyId !== companyId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Fetch documents
    const documents = await db
      .select()
      .from(knowledgeBaseDocuments)
      .where(eq(knowledgeBaseDocuments.companyId, companyId))
      .orderBy(knowledgeBaseDocuments.createdAt);
    
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
        status: doc.processedAt ? 'processed' : 'pending_processing',
      })),
    });
    
  } catch (error) {
    console.error('Document list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}