import { type NextRequest, NextResponse } from 'next/server';
import { RATE_LIMITS } from '@/lib/config/index';
import { MemoryRateLimiter } from './memory';

/**
 * Rate limiter interface
 */
export interface RateLimiter {
  check(key: string, limit: number, window: number): Promise<RateLimitResult>;
  reset(key: string): Promise<void>;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

/**
 * Rate limit error response
 */
export interface RateLimitError {
  error: string;
  message: string;
  retryAfter: number;
  resetAt: string;
}

/**
 * Get the appropriate rate limiter based on environment
 */
function getRateLimiter(): RateLimiter {
  // Use Firestore for production, in-memory for development
  if (process.env.NODE_ENV === 'production') {
    // return new FirestoreRateLimiter();
    return new MemoryRateLimiter();
  }

  // Use in-memory rate limiter for development
  return new MemoryRateLimiter();
}

// Singleton rate limiter instance
const rateLimiter = getRateLimiter();

/**
 * Get rate limit configuration for a given path
 */
function getRateLimitConfig(path: string): { max: number; windowMs: number } {
  // Find matching rate limit config
  for (const [pattern, config] of Object.entries(
    RATE_LIMITS as Record<string, { max: number; windowMs: number }>,
  )) {
    if (pattern === 'default') continue;

    // Simple pattern matching (could be enhanced with regex)
    if (path.startsWith(pattern.replace('*', ''))) {
      return config;
    }
  }

  // Default rate limit
  return RATE_LIMITS.default as { max: number; windowMs: number };
}

/**
 * Create a unique key for rate limiting
 */
function createRateLimitKey(identifier: string, path: string): string {
  return `rate_limit:${path}:${identifier}`;
}

/**
 * Extract identifier from request (IP, user ID, etc.)
 */
function getIdentifier(request: NextRequest, userId?: string): string {
  // Prefer user ID if available
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';

  return `ip:${ip}`;
}

/**
 * Rate limit middleware function
 */
export async function rateLimit(
  request: NextRequest,
  userId?: string,
): Promise<RateLimitResult | NextResponse> {
  const path = request.nextUrl.pathname;
  const config = getRateLimitConfig(path);
  const identifier = getIdentifier(request, userId);
  const key = createRateLimitKey(identifier, path);

  try {
    const result = await rateLimiter.check(key, config.max, config.windowMs);

    if (!result.allowed) {
      // Create rate limit error response
      const errorResponse: RateLimitError = {
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Please try again in ${Math.ceil(result.retryAfter || 0)} seconds.`,
        retryAfter: result.retryAfter || 0,
        resetAt: result.resetAt.toISOString(),
      };

      return NextResponse.json(errorResponse, {
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetAt.toISOString(),
          'Retry-After': Math.ceil(result.retryAfter || 0).toString(),
        },
      });
    }

    // Add rate limit headers to the response
    return result;
  } catch (error) {
    console.error('Rate limiting error:', error);

    // In case of error, allow the request but log it
    return {
      allowed: true,
      remaining: config.max,
      resetAt: new Date(Date.now() + config.windowMs),
    };
  }
}

/**
 * Apply rate limit headers to response
 */
export function applyRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
  limit: number,
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.resetAt.toISOString());

  return response;
}

/**
 * Rate limit decorator for API routes
 */
export function withRateLimit(
  handler: (
    request: NextRequest,
    context?: any,
  ) => Promise<Response> | Response,
  customConfig?: { max: number; windowMs: number },
) {
  return async (request: NextRequest, context?: any): Promise<Response> => {
    // Get user ID if available from auth
    let userId: string | undefined;
    const authHeader = request.headers.get('Authorization');
    const idToken = authHeader?.split('Bearer ')[1];

    if (idToken) {
      try {
        // const decodedToken = await adminAuth.verifyIdToken(idToken);
        const decodedToken = { uid: 'mock-user-id' };
        userId = decodedToken.uid;
      } catch {
        // Auth not available
      }
    }

    const path = request.nextUrl.pathname;
    const config = customConfig || getRateLimitConfig(path);
    const identifier = getIdentifier(request, userId);
    const key = createRateLimitKey(identifier, path);

    const result = await rateLimiter.check(key, config.max, config.windowMs);

    if (!result.allowed) {
      const errorResponse: RateLimitError = {
        error: 'RATE_LIMIT_EXCEEDED',
        message: `Too many requests. Please try again in ${Math.ceil(result.retryAfter || 0)} seconds.`,
        retryAfter: result.retryAfter || 0,
        resetAt: result.resetAt.toISOString(),
      };

      return NextResponse.json(errorResponse, {
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': result.resetAt.toISOString(),
          'Retry-After': Math.ceil(result.retryAfter || 0).toString(),
        },
      });
    }

    // Execute the handler
    const response = await handler(request, context);

    // Add rate limit headers to successful responses
    if (response instanceof NextResponse) {
      response.headers.set('X-RateLimit-Limit', config.max.toString());
      response.headers.set(
        'X-RateLimit-Remaining',
        result.remaining.toString(),
      );
      response.headers.set('X-RateLimit-Reset', result.resetAt.toISOString());
    }

    return response;
  };
}

// Export the singleton instance for direct use
export { rateLimiter };
