import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { knowledgeBaseDocuments } from '@/lib/db/schema';
import { isNull } from 'drizzle-orm';
import { processDocument } from '@/lib/documents/processor';
import { withCronAuth, withPlatformAdmin } from '@/lib/auth/api-middleware';

// This can be called by Vercel Cron or manually by platform admins
export const GET = withCronAuth(async (request: NextRequest) => {
  try {
    
    // Find unprocessed documents (limit to prevent timeout)
    const unprocessedDocs = await db
      .select()
      .from(knowledgeBaseDocuments)
      .where(isNull(knowledgeBaseDocuments.processedAt))
      .limit(5); // Process 5 at a time to avoid timeout
    
    if (unprocessedDocs.length === 0) {
      return NextResponse.json({ 
        message: 'No documents to process',
        processed: 0 
      });
    }
    
    const results = [];
    
    for (const doc of unprocessedDocs) {
      try {
        await processDocument(doc.id);
        results.push({ 
          documentId: doc.id, 
          status: 'success' 
        });
      } catch (error) {
        console.error(`Failed to process document ${doc.id}:`, error);
        results.push({ 
          documentId: doc.id, 
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    
    return NextResponse.json({
      success: true,
      data: {
        message: `Processed ${successCount} of ${results.length} documents`,
        processed: successCount,
        failed: results.length - successCount,
        results
      }
    });
    
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'CRON_ERROR',
          message: 'Document processing failed',
          details: process.env.NODE_ENV === 'development' ? error : undefined
        }
      },
      { status: 500 }
    );
  }
});

// Manual trigger for specific document - now requires platform admin
export const POST = withPlatformAdmin(async (request: NextRequest, { session }) => {
  try {
    const { documentId } = await request.json();
    
    if (!documentId) {
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Document ID required'
          }
        },
        { status: 400 }
      );
    }
    
    const result = await processDocument(documentId);
    
    return NextResponse.json({
      success: true,
      data: {
        message: 'Document processed successfully',
        result
      },
      metadata: {
        processedBy: session.user.id,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Document processing error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: 'Failed to process document',
          details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
        }
      },
      { status: 500 }
    );
  }
});