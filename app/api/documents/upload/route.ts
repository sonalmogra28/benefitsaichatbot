/**
 * Document Upload API
 * Handles document upload and processing
 */

import { NextRequest, NextResponse } from 'next/server';
import { documentService } from '@/lib/document-processing/document-service';
import { logger } from '@/lib/logging/logger';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { validateBody } from '@/lib/middleware/validation';
import { handleAPIError } from '@/lib/errors/api-errors';
import { z } from 'zod';

// Validation schema for document upload
const documentUploadSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  mimeType: z.string().min(1, 'MIME type is required'),
  category: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Extract user info from middleware
    const userId = request.headers.get('x-user-id');
    const tenantId = request.headers.get('x-company-id');

    if (!userId || !tenantId) {
      logger.securityEvent('Unauthorized document upload request', {
        userAgent: request.headers.get('user-agent'),
      });
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Apply rate limiting
    const rateLimitResponse = await rateLimiters.documentUpload(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const filename = formData.get('filename') as string;
    const mimeType = formData.get('mimeType') as string;
    const category = formData.get('category') as string;

    if (!file) {
      return new NextResponse('No file provided', { status: 400 });
    }

    // Validate request data
    const validationResult = documentUploadSchema.safeParse({
      filename: filename || file.name,
      mimeType: mimeType || file.type,
      category,
    });

    if (!validationResult.success) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid request data', details: validationResult.error.errors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Convert file to buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload and process document
    const document = await documentService.uploadDocument({
      file: fileBuffer,
      filename: validationResult.data.filename,
      mimeType: validationResult.data.mimeType,
      tenantId,
      uploadedBy: userId,
      category: validationResult.data.category,
    });

    // Log successful upload
    const duration = Date.now() - startTime;
    logger.apiResponse('POST', '/api/documents/upload', 200, duration, {
      userId,
      tenantId,
      documentId: document.id,
      filename: document.filename,
      size: document.size,
    });

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        size: document.size,
        status: document.status,
        createdAt: document.createdAt,
      },
    });
  } catch (error) {
    return handleAPIError(error, 'Document upload failed', {
      endpoint: '/api/documents/upload',
      method: 'POST',
      startTime,
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Extract user info from middleware
    const userId = request.headers.get('x-user-id');
    const tenantId = request.headers.get('x-company-id');

    if (!userId || !tenantId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get tenant documents
    const documents = await documentService.getTenantDocuments(tenantId, userId, limit);

    // Filter by category if specified
    const filteredDocuments = category
      ? documents.filter(doc => doc.metadata?.category === category)
      : documents;

    return NextResponse.json({
      success: true,
      documents: filteredDocuments.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        size: doc.size,
        status: doc.status,
        category: doc.metadata?.category,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
      total: filteredDocuments.length,
    });
  } catch (error) {
    const apiError = handleAPIError(error);
    return NextResponse.json(
      {
        success: false,
        error: apiError.message,
        code: apiError.code
      },
      { status: apiError.statusCode }
    );
  }
}
