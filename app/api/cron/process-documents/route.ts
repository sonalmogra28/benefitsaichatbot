import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { knowledgeBaseDocuments } from '@/lib/db/schema-v2';
import { eq, isNull } from 'drizzle-orm';
import { processDocument } from '@/lib/documents/processor';

// This can be called by Vercel Cron or manually
export async function GET(request: NextRequest) {
  try {
    // Verify this is from Vercel Cron (in production)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
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
      message: `Processed ${successCount} of ${results.length} documents`,
      processed: successCount,
      failed: results.length - successCount,
      results
    });
    
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Manual trigger for specific document
export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json();
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID required' },
        { status: 400 }
      );
    }
    
    const result = await processDocument(documentId);
    
    return NextResponse.json({
      success: true,
      result
    });
    
  } catch (error) {
    console.error('Document processing error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}