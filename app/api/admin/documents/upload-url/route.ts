import { type NextRequest, NextResponse } from 'next/server';
import { protectAdminEndpoint } from '@/lib/middleware/auth';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/logging/logger';
import { getStorageServices } from '@/lib/azure/storage';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
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

    const { fileName, fileType } = await request.json();
    
    if (!fileName || !fileType) {
      return NextResponse.json(
        { success: false, error: 'fileName and fileType are required' },
        { status: 400 }
      );
    }

    logger.info('API Request: POST /api/admin/documents/upload-url', {
      userId: user.id,
      fileName,
      fileType
    });

    // Get storage services
    const storageServices = await getStorageServices();
    
    const blobName = `${new Date().getTime()}-${fileName}`;
    
    // Generate a pre-signed URL for upload (1 hour expiry)
    const sasUrl = await storageServices.documents.getFileUrl(blobName, 60);

    const duration = Date.now() - startTime;
    
    logger.apiResponse('POST', '/api/admin/documents/upload-url', 200, duration, {
      userId: user.id,
      fileName,
      fileType
    });

    return NextResponse.json({ 
      success: true,
      data: {
        sasUrl, 
        blobName 
      }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('SAS URL generation error', {
      path: request.nextUrl.pathname,
      method: request.method,
      duration
    }, error as Error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate upload URL' 
      }, 
      { status: 500 }
    );
  }
}