/**
 * Advanced Rate Limiting
 * Implements sophisticated rate limiting for security and compliance
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging/logger';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: NextRequest) => string;
  onLimitReached?: (req: NextRequest, key: string) => void;
}

export interface RateLimitRule {
  name: string;
  config: RateLimitConfig;
  conditions?: (req: NextRequest) => boolean;
}

export class AdvancedRateLimiter {
  private rules: RateLimitRule[];
  private store: Map<string, { count: number; resetTime: number }>;

  constructor(rules: RateLimitRule[] = []) {
    this.rules = rules;
    this.store = new Map();
  }

  /**
   * Check if request is within rate limits
   */
  async checkRateLimit(req: NextRequest): Promise<NextResponse | null> {
    const ip = this.getClientIP(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const userId = req.headers.get('x-user-id') || 'anonymous';

    for (const rule of this.rules) {
      // Check if rule applies to this request
      if (rule.conditions && !rule.conditions(req)) {
        continue;
      }

      const key = rule.config.keyGenerator 
        ? rule.config.keyGenerator(req)
        : this.generateKey(rule.name, ip, userId);

      const isAllowed = await this.checkRule(rule, key, req);
      
      if (!isAllowed) {
        logger.securityEvent('Rate limit exceeded', {
          rule: rule.name,
          ip,
          userId,
          userAgent,
          path: req.nextUrl.pathname,
        });

        if (rule.config.onLimitReached) {
          rule.config.onLimitReached(req, key);
        }

        return new NextResponse(
          JSON.stringify({
            error: 'Rate limit exceeded',
            message: `Too many requests. Limit: ${rule.config.maxRequests} per ${rule.config.windowMs}ms`,
            retryAfter: this.getRetryAfter(rule.config.windowMs),
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': this.getRetryAfter(rule.config.windowMs).toString(),
              'X-RateLimit-Limit': rule.config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(Date.now() + rule.config.windowMs).toISOString(),
            },
          }
        );
      }
    }

    return null;
  }

  /**
   * Check individual rate limit rule
   */
  private async checkRule(rule: RateLimitRule, key: string, req: NextRequest): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - rule.config.windowMs;
    
    // Get or create rate limit entry
    let entry = this.store.get(key);
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + rule.config.windowMs,
      };
    }

    // Check if we're in a new window
    if (entry.resetTime < now) {
      entry.count = 0;
      entry.resetTime = now + rule.config.windowMs;
    }

    // Increment counter
    entry.count++;
    this.store.set(key, entry);

    // Check if limit exceeded
    if (entry.count > rule.config.maxRequests) {
      return false;
    }

    // Log rate limit status
    logger.debug('Rate limit check', {
      rule: rule.name,
      key,
      count: entry.count,
      limit: rule.config.maxRequests,
      remaining: rule.config.maxRequests - entry.count,
    });

    return true;
  }

  /**
   * Generate rate limit key
   */
  private generateKey(ruleName: string, ip: string, userId: string): string {
    return `${ruleName}:${ip}:${userId}`;
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: NextRequest): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIP = req.headers.get('x-real-ip');
    const cfConnectingIP = req.headers.get('cf-connecting-ip');
    
    if (cfConnectingIP) return cfConnectingIP;
    if (realIP) return realIP;
    if (forwarded) return forwarded.split(',')[0].trim();
    
    return (req as any).ip || req.headers.get('x-forwarded-for') || 'unknown';
  }

  /**
   * Calculate retry after time
   */
  private getRetryAfter(windowMs: number): number {
    return Math.ceil(windowMs / 1000);
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetTime < now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get rate limit status for a key
   */
  getStatus(key: string): { count: number; limit: number; remaining: number; resetTime: number } | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (entry.resetTime < now) {
      this.store.delete(key);
      return null;
    }

    return {
      count: entry.count,
      limit: 0, // Would need to know which rule this key belongs to
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }
}

// Predefined rate limit rules
export const defaultRateLimitRules: RateLimitRule[] = [
  // General API rate limiting
  {
    name: 'api-general',
    config: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000,
      keyGenerator: (req) => `api:${req.headers.get('x-user-id') || (req as any).ip}`,
    },
  },
  
  // Chat API rate limiting
  {
    name: 'chat-api',
    config: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 30,
      keyGenerator: (req) => `chat:${req.headers.get('x-user-id') || (req as any).ip}`,
    },
    conditions: (req) => req.nextUrl.pathname.startsWith('/api/chat'),
  },
  
  // Document upload rate limiting
  {
    name: 'document-upload',
    config: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 5,
      keyGenerator: (req) => `upload:${req.headers.get('x-user-id') || (req as any).ip}`,
    },
    conditions: (req) => req.nextUrl.pathname.startsWith('/api/documents/upload'),
  },
  
  // Document search rate limiting
  {
    name: 'document-search',
    config: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 20,
      keyGenerator: (req) => `search:${req.headers.get('x-user-id') || (req as any).ip}`,
    },
    conditions: (req) => req.nextUrl.pathname.startsWith('/api/documents/search'),
  },
  
  // Admin API rate limiting
  {
    name: 'admin-api',
    config: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      keyGenerator: (req) => `admin:${req.headers.get('x-user-id') || (req as any).ip}`,
    },
    conditions: (req) => req.nextUrl.pathname.startsWith('/api/admin'),
  },
  
  // Authentication rate limiting
  {
    name: 'auth-api',
    config: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 10,
      keyGenerator: (req) => `auth:${(req as any).ip}`,
    },
    conditions: (req) => req.nextUrl.pathname.startsWith('/api/auth'),
  },
  
  // IP-based rate limiting (stricter)
  {
    name: 'ip-strict',
    config: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
      keyGenerator: (req) => `ip:${(req as any).ip}`,
    },
  },
];

// Create rate limiter instance
export const advancedRateLimiter = new AdvancedRateLimiter(defaultRateLimitRules);

// Cleanup expired entries every 5 minutes
setInterval(() => {
  advancedRateLimiter.cleanup();
}, 5 * 60 * 1000);
