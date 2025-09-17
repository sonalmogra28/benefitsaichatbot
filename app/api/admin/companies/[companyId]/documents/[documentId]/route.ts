import { type NextRequest, NextResponse } from 'next/server';
import { protectAdminEndpoint, protectCompanyEndpoint } from '@/lib/middleware/auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logging/logger';
import { getRepositories } from '@/lib/azure/cosmos';
import { getStorageServices } from '@/lib/azure/storage';
import { deleteDocumentVectors } from '@/lib/ai/vector-search';

interface RouteParams {
  params: Promise<{
    companyId: string;
    documentId: string;
  }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const startTime = Date.now();
  const { companyId, documentId } = await params;
  
  try {
    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.admin(request);
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

    const { url } = await request.json();

    logger.info('API Request: DELETE /api/admin/companies/[companyId]/documents/[documentId]', {
      userId: user.id,
      companyId,
      documentId,
      hasUrl: !!url
    });

    // 1. Delete from Azure Blob Storage if URL is provided
    if (url) {
      try {
        const storageServices = await getStorageServices();
        // Extract filename from URL for deletion
        const urlParts = url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        await storageServices.documents.deleteFile(fileName);
        logger.info('Document deleted from blob storage', { documentId, fileName });
      } catch (error) {
        logger.warn('Failed to delete document from blob storage', { documentId, url, error });
        // Continue with other deletions even if blob deletion fails
      }
    }

    // 2. Delete vectors from the vector database
    try {
      await deleteDocumentVectors(companyId, documentId);
      logger.info('Document vectors deleted', { documentId, companyId });
    } catch (error) {
      logger.warn('Failed to delete document vectors', { documentId, companyId, error });
      // Continue with other deletions even if vector deletion fails
    }

    // 3. Delete the document record from Cosmos DB
    const repositories = await getRepositories();
    await repositories.documents.delete(documentId);
    logger.info('Document record deleted from database', { documentId, companyId });

    // 4. Delete all document chunks
    try {
      const chunksQuery = `SELECT * FROM c WHERE c.documentId = @documentId AND c.companyId = @companyId`;
      const chunksParameters = [
        { name: '@documentId', value: documentId },
        { name: '@companyId', value: companyId }
      ];
      
      const { resources: chunks } = await repositories.documentChunks.query(chunksQuery, chunksParameters);
      
      for (const chunk of chunks) {
        await repositories.documentChunks.delete(chunk.id, companyId);
      }
      
      logger.info('Document chunks deleted', { documentId, companyId, chunksCount: chunks.length });
    } catch (error) {
      logger.warn('Failed to delete document chunks', { documentId, companyId, error });
      // Continue even if chunk deletion fails
    }

    const duration = Date.now() - startTime;
    
    logger.apiResponse('DELETE', '/api/admin/companies/[companyId]/documents/[documentId]', 200, duration, {
      userId: user.id,
      companyId,
      documentId
    });

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
      data: {
        documentId,
        companyId,
        deletedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Document deletion error', {
      path: request.nextUrl.pathname,
      method: request.method,
      companyId,
      documentId,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete document' 
      },
      { status: 500 }
    );
  }
}