import { type NextRequest, NextResponse } from 'next/server';
import { protectAdminEndpoint, protectCompanyEndpoint } from '@/lib/middleware/auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logging/logger';
import { getRepositories } from '@/lib/azure/cosmos';
import { getStorageServices } from '@/lib/azure/storage';
import { z } from 'zod';

// Schema for upload metadata
const uploadMetadataSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  documentType: z.string().default('benefits_guide'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

interface RouteParams {
  params: Promise<{
    companyId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { companyId } = await params;
  
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.upload(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Authenticate and authorize
    const { user, error } = await protectAdminEndpoint(request);
    if (error || !user) {
      return error!;
    }

    // Check company access
    const { user: companyUser, error: companyError } = await protectCompanyEndpoint(request, companyId);
    if (companyError || !companyUser) {
      return companyError!;
    }

    logger.info('API Request: POST /api/admin/companies/[companyId]/documents/upload', {
      userId: user.id,
      companyId
    });

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const metadata = formData.get('metadata') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Unsupported file type. Only PDF and text files are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Parse and validate metadata
    let parsedMetadata;
    try {
      parsedMetadata = uploadMetadataSchema.parse(JSON.parse(metadata || '{}'));
    } catch (error) {
      return NextResponse.json(
        { success: false, error: 'Invalid metadata format' },
        { status: 400 }
      );
    }

    // Upload file to Azure Blob Storage
    const storageServices = await getStorageServices();
    const fileName = `${Date.now()}_${file.name}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    
    const uploadResult = await storageServices.documents.uploadFile(
      fileName,
      fileBuffer,
      file.type,
      {
        originalName: file.name,
        uploadedBy: user.id,
        companyId,
        title: parsedMetadata.title,
        documentType: parsedMetadata.documentType,
        category: parsedMetadata.category || '',
        tags: parsedMetadata.tags?.join(',') || ''
      }
    );

    // Save document record to Cosmos DB
    const repositories = await getRepositories();
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const document = {
      id: documentId,
      title: parsedMetadata.title,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileUrl: uploadResult,
      storagePath: fileName,
      documentType: parsedMetadata.documentType,
      category: parsedMetadata.category,
      tags: parsedMetadata.tags || [],
      companyId,
      status: 'pending',
      uploadedBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await repositories.documents.create(document);

    // Trigger document processing (async)
    try {
      // TODO: Implement document processing trigger
      logger.info('Document processing triggered', { documentId, companyId });
    } catch (error) {
      logger.warn('Failed to trigger document processing', { documentId, error });
    }

    const duration = Date.now() - startTime;
    
    logger.apiResponse('POST', '/api/admin/companies/[companyId]/documents/upload', 200, duration, {
      userId: user.id,
      companyId,
      documentId,
      fileName: file.name,
      fileSize: file.size
    });

    return NextResponse.json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        documentId,
        fileName: file.name,
        fileSize: file.size,
        status: 'pending',
        uploadedAt: document.createdAt
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Document upload error', {
      path: request.nextUrl.pathname,
      method: request.method,
      companyId,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to upload document' 
      },
      { status: 500 }
    );
  }
}