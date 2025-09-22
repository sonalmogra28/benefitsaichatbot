import { NextRequest, NextResponse } from 'next/server';
import { apiTrackingService } from '@/lib/services/api-tracking.service';
import { logger } from '@/lib/logging/logger';

export interface APITrackingOptions {
  trackAll?: boolean;
  excludePaths?: string[];
  excludeMethods?: string[];
  trackResponseSize?: boolean;
  trackRequestSize?: boolean;
}

const defaultOptions: APITrackingOptions = {
  trackAll: true,
  excludePaths: ['/api/health', '/api/ready', '/_next'],
  excludeMethods: ['OPTIONS'],
  trackResponseSize: true,
  trackRequestSize: true
};

export function withAPITracking(
  handler: (request: NextRequest) => Promise<NextResponse>,
  options: APITrackingOptions = {}
) {
  const config = { ...defaultOptions, ...options };

  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();
    let response: NextResponse;

    try {
      // Check if we should track this request
      if (!shouldTrackRequest(request, config)) {
        return await handler(request);
      }

      // Extract request information
      const requestInfo = extractRequestInfo(request);
      
      // Execute the handler
      response = await handler(request);
      
      // Calculate response time
      const responseTime = Date.now() - startTime;
      
      // Track the API call
      await apiTrackingService.trackAPICall({
        endpoint: requestInfo.endpoint,
        method: requestInfo.method,
        userId: requestInfo.userId,
        companyId: requestInfo.companyId,
        statusCode: response.status,
        responseTime,
        userAgent: requestInfo.userAgent,
        ipAddress: requestInfo.ipAddress,
        requestSize: requestInfo.requestSize,
        responseSize: await getResponseSize(response),
        errorMessage: response.status >= 400 ? `HTTP ${response.status}` : undefined
      });

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Track the error
      try {
        const requestInfo = extractRequestInfo(request);
        await apiTrackingService.trackAPICall({
          endpoint: requestInfo.endpoint,
          method: requestInfo.method,
          userId: requestInfo.userId,
          companyId: requestInfo.companyId,
          statusCode: 500,
          responseTime,
          userAgent: requestInfo.userAgent,
          ipAddress: requestInfo.ipAddress,
          requestSize: requestInfo.requestSize,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      } catch (trackingError) {
        logger.error('Failed to track API call', {}, trackingError as Error);
      }
      
      throw error;
    }
  };
}

function shouldTrackRequest(request: NextRequest, config: APITrackingOptions): boolean {
  if (!config.trackAll) {
    return false;
  }

  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // Check excluded paths
  if (config.excludePaths?.some(path => pathname.startsWith(path))) {
    return false;
  }

  // Check excluded methods
  if (config.excludeMethods?.includes(method)) {
    return false;
  }

  return true;
}

function extractRequestInfo(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;
  const userAgent = request.headers.get('user-agent') || undefined;
  const ipAddress = getClientIP(request);
  
  // Try to extract user info from headers (if available)
  const userId = request.headers.get('x-user-id') || undefined;
  const companyId = request.headers.get('x-company-id') || undefined;
  
  // Calculate request size
  const requestSize = getRequestSize(request);

  return {
    endpoint: pathname,
    method,
    userId,
    companyId,
    userAgent,
    ipAddress,
    requestSize
  };
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return 'unknown';
}

function getRequestSize(request: NextRequest): number | undefined {
  const contentLength = request.headers.get('content-length');
  return contentLength ? parseInt(contentLength, 10) : undefined;
}

async function getResponseSize(response: NextResponse): Promise<number | undefined> {
  try {
    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      return parseInt(contentLength, 10);
    }
    
    // If no content-length header, we can't easily determine size
    // without consuming the response body
    return undefined;
  } catch (error) {
    logger.error('Failed to get response size', {}, error as Error);
    return undefined;
  }
}

// Utility function to manually track API calls
export async function trackAPICall(
  endpoint: string,
  method: string,
  statusCode: number,
  responseTime: number,
  options: {
    userId?: string;
    companyId?: string;
    userAgent?: string;
    ipAddress?: string;
    requestSize?: number;
    responseSize?: number;
    errorMessage?: string;
  } = {}
): Promise<void> {
  try {
    await apiTrackingService.trackAPICall({
      endpoint,
      method,
      statusCode,
      responseTime,
      ...options
    });
  } catch (error) {
    logger.error('Failed to manually track API call', error, {
      endpoint,
      method,
      statusCode
    });
  }
}
