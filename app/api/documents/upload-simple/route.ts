import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { getRepositories } from '@/lib/azure/cosmos';
import { getStorageServices } from '@/lib/azure/storage';
import { documentProcessingService } from '@/lib/services/document-processing.service';
import { logger } from '@/lib/logging/logger';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const companyId = formData.get('companyId') as string;
    const documentType = formData.get('documentType') as string || 'benefits';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    // Generate unique document ID
    const documentId = uuidv4();
    
    // Upload to Azure Blob Storage
    const storageServices = await getStorageServices();
    const fileName = `${companyId}/documents/${documentId}.pdf`;
    
    const uploadResult = await storageServices.uploadFile(
      file.stream(),
      fileName,
      file.type
    );

    if (!uploadResult.success) {
      throw new Error('Failed to upload file to storage');
    }

    // Create document record in Cosmos DB
    const repositories = await getRepositories();
    const document = {
      id: documentId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      storageUrl: uploadResult.url,
      companyId,
      documentType,
      status: 'uploaded',
      uploadedBy: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await repositories.documents.create(document);

    // Trigger document processing for RAG
    try {
      await documentProcessingService.triggerDocumentProcessing(documentId, companyId);
      logger.info('Document processing triggered', { documentId, companyId });
    } catch (error) {
      logger.warn('Failed to trigger document processing', { documentId, error });
    }

    return NextResponse.json({
      success: true,
      documentId,
      message: 'Document uploaded successfully and processing started'
    });

  } catch (error) {
    logger.error('Document upload failed', error as Error);
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
