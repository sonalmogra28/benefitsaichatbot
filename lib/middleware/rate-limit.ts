/**
 * Rate limiting middleware for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { redisRateLimiter, rateLimitConfigs, RateLimitType } from '@/lib/rate-limit/redis-limiter';
import { logger } from '@/lib/logging/logger';

export function createRateLimit(type: RateLimitType) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    try {
      const config = rateLimitConfigs[type];
      
      // Create rate limit key based on IP and user
      const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      const userId = request.headers.get('x-user-id') || 'anonymous';
      const key = `${type}:${ip}:${userId}`;

      const result = await redisRateLimiter.check(key, config);

      // Add rate limit headers
      const response = NextResponse.next();
      response.headers.create('X-RateLimit-Limit', config.maxRequests.toString());
      response.headers.create('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.create('X-RateLimit-Reset', result.resetAt.getTime().toString());

      if (!result.allowed) {
        logger.warn('Rate limit exceeded', {
          type,
          ip,
          userId,
          key,
          remaining: result.remaining,
          resetAt: result.resetAt,
        });

        const errorResponse = NextResponse.json(
          {
            error: config.message,
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: result.retryAfter,
            resetAt: result.resetAt,
          },
          { status: 429 }
        );

        // Add rate limit headers to error response
        errorResponse.headers.create('X-RateLimit-Limit', config.maxRequests.toString());
        errorResponse.headers.create('X-RateLimit-Remaining', '0');
        errorResponse.headers.create('X-RateLimit-Reset', result.resetAt.getTime().toString());
        errorResponse.headers.create('Retry-After', result.retryAfter?.toString() || '60');

        return errorResponse;
      }

      return null; // Allow request to continue
    } catch (error) {
      logger.error('Rate limiting error', { type, error });
      // On error, allow the request but log it
      return null;
    }
  };
}

// Pre-configured rate limiters
export const rateLimiters = {
  auth: createRateLimit('auth'),
  api: createRateLimit('api'),
  chat: createRateLimit('chat'),
  upload: createRateLimit('upload'),
  admin: createRateLimit('admin'),
};

// Helper to apply rate limiting to API routes
export async function withRateLimit<T extends any[]>(
  rateLimiter: (request: NextRequest) => Promise<NextResponse | null>,
  handler: (...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const rateLimitResponse = await rateLimiter(request);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    return handler(request, ...args);
  };
}
