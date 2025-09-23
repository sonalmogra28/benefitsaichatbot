import { type NextRequest, NextResponse } from 'next/server';
import { redisRateLimiter } from '@/lib/rate-limit/redis-limiter';

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  resetAt: Date;
}

// Rate limit configurations per endpoint type
export const RATE_LIMIT_CONFIGS = {
  // Authentication endpoints - strict limits
  auth: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many authentication attempts. Please try again later.',
  },
  
  // API endpoints - moderate limits
  api: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'API rate limit exceeded. Please try again later.',
  },
  
  // Chat endpoints - generous limits
  chat: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    message: 'Chat rate limit exceeded. Please slow down your requests.',
  },
  
  // Upload endpoints - strict limits
  upload: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    message: 'Upload rate limit exceeded. Please try again later.',
  },
} as const;

type RateLimitConfigType = keyof typeof RATE_LIMIT_CONFIGS;

// In-memory rate limit store (for development)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

async function checkRateLimit(
  clientId: string,
  endpoint: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const key = `${endpoint}:${clientId}`;
  
  try {
    // Use Azure Redis Cache for rate limiting
    const result = await redisRateLimiter.check(key, config);
    
    return {
      limited: !result.allowed,
      remaining: result.remaining,
      resetAt: result.resetAt,
    };
  } catch (error) {
    console.error('Rate limiter error:', error);
    // On error, allow the request but log it
    return {
      limited: false,
      remaining: config.maxRequests,
      resetAt: new Date(Date.now() + config.windowMs),
    };
  }
}

export function withRateLimit(
  configType: RateLimitConfigType,
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const config = RATE_LIMIT_CONFIGS[configType];
    const clientId = (request as any).ip || request.headers.get('x-forwarded-for') || 'unknown';
    const endpoint = request.nextUrl.pathname;

    const result = await checkRateLimit(clientId, endpoint, config);

    if (result.limited) {
      return NextResponse.json(
        { 
          error: config.message || 'Rate limit exceeded',
          retryAfter: Math.ceil((result.resetAt.getTime() - Date.now()) / 1000)
        },
        { status: 429 }
      );
    }

    // Add rate limit headers
    const response = await handler(request);
    response.headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.resetAt.toISOString());

    return response;
  };
}
