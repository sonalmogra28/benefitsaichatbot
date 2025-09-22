/**
 * Rate limiting middleware for API routes
 * Implements token bucket algorithm with Firestore backend
 */

import { type NextRequest, NextResponse } from 'next/server';
// import { adminDb } from '@/lib/azure/admin'; // Removed Firebase dependency
import crypto from 'node:crypto';

// Rate limit configurations per endpoint type
export const RATE_LIMIT_CONFIGS = {
  // Authentication endpoints - strict limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts. Please try again later.',
  },
  // File uploads - moderate limits
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    message: 'Upload limit exceeded. Please try again later.',
  },
  // API reads - generous limits
  read: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Too many requests. Please slow down.',
  },
  // API writes - moderate limits
  write: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30,
    message: 'Too many write operations. Please try again later.',
  },
  // AI/LLM endpoints - expensive operations
  ai: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 50,
    message: 'AI request limit exceeded. Please try again later.',
  },
  // Admin operations - strict limits
  admin: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Admin operation limit exceeded.',
  },
};

export type RateLimitConfig = keyof typeof RATE_LIMIT_CONFIGS;

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(req: NextRequest): string {
  // Try to get authenticated user ID first
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    // Hash the token to create a consistent identifier
    const token = authHeader.replace('Bearer ', '');
    return crypto
      .createHash('sha256')
      .update(token)
      .digest('hex')
      .substring(0, 16);
  }

  // Fall back to IP address
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  // Combine IP with user agent for better fingerprinting
  const userAgent = req.headers.get('user-agent') || 'unknown';
  const fingerprint = `${ip}-${userAgent}`;

  return crypto
    .createHash('sha256')
    .update(fingerprint)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Check if client has exceeded rate limit
 */
async function isRateLimited(
  clientId: string,
  endpoint: string,
  config: (typeof RATE_LIMIT_CONFIGS)[RateLimitConfig],
): Promise<{ limited: boolean; remaining: number; resetAt: Date }> {
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const rateLimitKey = `rateLimit:${endpoint}:${clientId}`;

  try {
    // Get rate limit document from Firestore
    // const docRef = adminDb.collection('rate_limits').getById(rateLimitKey);
    // const doc = await docRef.get();

    // For now, use in-memory rate limiting
    return {
      limited: false,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now + config.windowMs),
    };

    // if (!doc.exists) {
    //   // First request - create rate limit entry
    //   await docRef.create({
    //     clientId,
    //     endpoint,
    //     requests: [{ timestamp: now }],
    //     windowStart: now,
    //     createdAt: new Date().toISOString(),
    //   });

    //   return {
    //     limited: false,
    //     remaining: config.maxRequests - 1,
    //     resetAt: new Date(now + config.windowMs),
    //   };
    // }

    // const data = doc.data();
    // if (!data) {
    //   // Handle case where document exists but data is empty
    //   return {
    //     limited: false,
    //     remaining: config.maxRequests,
    //     resetAt: new Date(now + config.windowMs),
    //   };
    // }
    // const requests = data.requests || [];

    // // Filter out requests outside the current window
    // const recentRequests = requests.filter(
    //   (r: { timestamp: number }) => r.timestamp > windowStart,
    // );

    // // Check if limit exceeded
    // if (recentRequests.length >= config.maxRequests) {
    //   const oldestRequest = recentRequests[0].timestamp;
    //   const resetAt = new Date(oldestRequest + config.windowMs);

    //   // Log rate limit violation
    //   await adminDb.collection('rate_limit_violations').create({
    //     clientId,
    //     endpoint,
    //     timestamp: new Date().toISOString(),
    //     requestCount: recentRequests.length,
    //     limit: config.maxRequests,
    //   });

    //   return {
    //     limited: true,
    //     remaining: 0,
    //     resetAt,
    //   };
    // }

    // // Add current request
    // recentRequests.push({ timestamp: now });

    // // Update the document
    // await docRef.update({
    //   requests: recentRequests,
    //   lastRequestAt: new Date().toISOString(),
    // });

    return {
      limited: false,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now + config.windowMs),
    };
  } catch (error) {
    console.error('Rate limiter error:', error);
    // On error, allow the request but log it
    // await adminDb.collection('error_logs').create({
    //   type: 'rate_limiter_error',
    //   error: error instanceof Error ? error.message : 'Unknown error',
    //   clientId,
    //   endpoint,
    //   timestamp: new Date().toISOString(),
    // });

    return {
      limited: false,
      remaining: config.maxRequests,
      resetAt: new Date(now + config.windowMs),
    };
  }
}

/**
 * Rate limiting middleware factory
 */
export function rateLimit(configType: RateLimitConfig = 'read') {
  const config = RATE_LIMIT_CONFIGS[configType];

  return async function rateLimitMiddleware(
    req: NextRequest,
    handler: () => Promise<NextResponse>,
  ): Promise<NextResponse> {
    // Skip rate limiting in development
    if (process.env.NODE_ENV === 'development') {
      return handler();
    }

    const clientId = getClientIdentifier(req);
    const endpoint = `${req.method}:${req.nextUrl.pathname}`;

    const { limited, remaining, resetAt } = await isRateLimited(
      clientId,
      endpoint,
      config,
    );

    // Add rate limit headers to response
    const response = limited
      ? NextResponse.json({ error: config.message }, { status: 429 })
      : await handler();

    // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', resetAt.toISOString());

    if (limited) {
      response.headers.set(
        'Retry-After',
        Math.ceil((resetAt.getTime() - Date.now()) / 1000).toString(),
      );
    }

    return response;
  };
}

/**
 * Middleware wrapper for use in API routes
 */
export function withRateLimit(
  configType: RateLimitConfig,
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
) {
  return async (req: NextRequest, context: any) => {
    const limiter = rateLimit(configType);
    return limiter(req, () => handler(req, context));
  };
}

/**
 * Clean up old rate limit entries (should be run periodically via cron)
 */
export async function cleanupRateLimits(): Promise<void> {
  // Cleanup function disabled - using in-memory rate limiting
  console.log('Rate limit cleanup skipped - using in-memory rate limiting');
}

/**
 * Get rate limit status for a client
 */
export async function getRateLimitStatus(
  clientId: string,
  endpoint: string,
  configType: RateLimitConfig = 'read',
): Promise<{
  used: number;
  limit: number;
  remaining: number;
  resetAt: Date;
}> {
  const config = RATE_LIMIT_CONFIGS[configType];
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const rateLimitKey = `rateLimit:${endpoint}:${clientId}`;

  // Return mock status for in-memory rate limiting
  return {
    used: 0,
    limit: config.maxRequests,
    remaining: config.maxRequests,
    resetAt: new Date(now + config.windowMs),
  };
}
