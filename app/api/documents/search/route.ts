/**
 * Document Search API
 * Handles document search and retrieval
 */

import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/lib/document-processing/document-service';
import { logger } from '@/lib/logging/logger';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { handleAPIError } from '@/lib/errors/api-errors';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Extract user info from middleware
    const userId = request.headers.get('x-user-id');
    const tenantId = request.headers.get('x-company-id');

    if (!userId || !tenantId) {
      logger.securityEvent('Unauthorized document search request', {
        userAgent: request.headers.get('user-agent'),
      });
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.documentSearch(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query) {
      return new NextResponse('Search query is required', { status: 400 });
    }

    // Search documents
    const documents = await documentService.searchDocuments(tenantId, query, category || undefined, limit);

    // Log successful search
    const duration = Date.now() - startTime;
    logger.apiResponse('GET', '/api/documents/search', 200, duration, {
      userId,
      tenantId,
      query,
      category,
      resultCount: documents.length,
    });

    return NextResponse.json({
      success: true,
      query,
      category,
      documents: documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        size: doc.size,
        status: doc.status,
        category: doc.metadata?.category,
        extractedText: doc.extractedText?.substring(0, 500) + '...', // Truncate for response
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
      total: documents.length,
    });
  } catch (error) {
    return handleAPIError(error, 'Document search failed', {
      endpoint: '/api/documents/search',
      method: 'GET',
      startTime,
    });
  }
}
