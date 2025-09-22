import { NextResponse, type NextRequest } from 'next/server';
import { getContainer } from '@/lib/azure/cosmos-db';
import { ragSystem } from '@/lib/ai/rag-system';
import logger from '@/lib/logger';

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    logger.warn('CRON_SECRET not configured');
    return false;
  }

  const authHeader = request.headers.get('authorization');
  const providedSecret = authHeader?.replace('Bearer ', '');
  
  return providedSecret === cronSecret;
}

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    if (!verifyCronSecret(request)) {
      logger.warn('Unauthorized cron request', {
        userAgent: request.headers.get('user-agent'),
      });
      return new NextResponse('Unauthorized', { status: 401 });
    }

    logger.info('Starting document processing cron job');

    // Query for documents that need processing
    // TODO: Implement Cosmos DB query for pending documents
    const documentsContainer = await getContainer('documents');
    const query = {
      query: "SELECT * FROM c WHERE c.status = 'pending_processing'",
      parameters: []
    };
    
    const { resources: pendingDocs } = await documentsContainer.items.query(query).fetchAll();
    
    if (pendingDocs.length === 0) {
      logger.info('No documents pending processing');
      return NextResponse.json({ 
        success: true, 
        message: 'No documents to process',
        processed: 0 
      });
    }

    const results: Array<{
      documentId: string;
      fileName: string;
      status: 'success' | 'error';
      error?: string;
    }> = [];
    let processed = 0;
    let errors = 0;

    for (const doc of pendingDocs) {
      try {
        const docData = doc;
        const { companyId, fileName, storageUrl, documentType } = docData;

        logger.info('Processing document', {
          documentId: doc.id,
          companyId,
          fileName,
          documentType,
        });

        // Update status to processing
        await documentsContainer.item(doc.id).replace({
          ...doc,
          status: 'processing',
          processingStartedAt: new Date(),
        });

        // Process the document using RAG system
        // For now, we'll simulate document processing
        // In a real implementation, you'd download from storageUrl and extract text
        const mockContent = `Document content for ${fileName}. This is sample content that would be extracted from the actual document.`;
        
        await ragSystem.processDocument(
          doc.id,
          companyId,
          mockContent,
          { fileName, documentType, storageUrl }
        );

        // Update status to processed
        await doc.ref.update({
          status: 'processed',
          processedAt: new Date(),
          error: null,
        });

        results.push({
          documentId: doc.id,
          fileName,
          status: 'success',
        });

        processed++;
        logger.info('Document processed successfully', {
          documentId: doc.id,
          fileName,
        });

      } catch (error) {
        errors++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        logger.error('Document processing failed', {
          documentId: doc.id,
          error: errorMessage,
        });

        // Update document with error status
        await doc.ref.update({
          status: 'error',
          error: errorMessage,
          errorAt: new Date(),
        });

        results.push({
          documentId: doc.id,
          fileName: doc.data().fileName,
          status: 'error',
          error: errorMessage,
        });
      }
    }

    logger.info('Document processing cron job completed', {
      processed,
      errors,
      total: pendingDocs.length,
    });

    return NextResponse.json({
      success: true,
      processed,
      errors,
      total: pendingDocs.length,
      results,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Cron job failed', {
      error: errorMessage,
    });

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Check how many documents are pending processing
  const documentsContainer = await getContainer('documents');
  const query = {
    query: "SELECT COUNT(1) as count FROM c WHERE c.status = 'pending_processing'",
    parameters: []
  };
  
  const { resources } = await documentsContainer.items.query(query).fetchAll();
  const pendingCount = resources[0]?.count || 0;

  return NextResponse.json({
    status: 'healthy',
    pendingDocuments: pendingCount,
    lastCheck: new Date().toISOString(),
  });
}
