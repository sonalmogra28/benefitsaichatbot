/**
 * Redis-based rate limiter for production use
 */

import { Redis } from 'ioredis';
import { logger } from '@/lib/logging/logger';
import { getRedisConfig } from '@/lib/azure/config';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

class RedisRateLimiter {
  private redis: Redis | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      // Use Azure Redis Cache configuration
      const redisConfig = getRedisConfig();
      
      if (redisConfig.host && redisConfig.password) {
        this.redis = new Redis({
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          tls: redisConfig.tls,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          enableReadyCheck: false,
        });
        
        this.redis.on('connect', () => {
          this.isConnected = true;
          logger.info('Azure Redis Cache connected for rate limiting', {
            host: redisConfig.host,
            port: redisConfig.port
          });
        });

        this.redis.on('ready', () => {
          this.isConnected = true;
          logger.info('Azure Redis Cache ready for rate limiting');
        });

        this.redis.on('error', (error) => {
          this.isConnected = false;
          logger.error('Azure Redis Cache connection error', { 
            error: error.message,
            host: redisConfig.host,
            port: redisConfig.port
          });
        });

        this.redis.on('close', () => {
          this.isConnected = false;
          logger.warn('Azure Redis Cache connection closed');
        });

        // Connect to Redis
        await this.redis.connect();
      } else {
        // Fallback to in-memory rate limiting if Redis is not configured
        logger.warn('Azure Redis Cache not configured, using in-memory rate limiting', {
          hasHost: !!redisConfig.host,
          hasPassword: !!redisConfig.password
        });
      }
    } catch (error) {
      logger.error('Failed to initialize Azure Redis Cache', { 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Continue with in-memory fallback
    }
  }

  async check(
    key: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      if (this.redis && this.isConnected) {
        return await this.checkWithRedis(key, config, now, windowStart);
      } else {
        return await this.checkWithMemory(key, config, now, windowStart);
      }
    } catch (error) {
      logger.error('Rate limiter error', { key, error });
      // On error, allow the request but log it
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetAt: new Date(now + config.windowMs),
      };
    }
  }

  private async checkWithRedis(
    key: string,
    config: RateLimitConfig,
    now: number,
    windowStart: number
  ): Promise<RateLimitResult> {
    const pipeline = this.redis!.pipeline();
    
    // Remove old entries
    pipeline.zremrangebyscore(key, '-inf', windowStart);
    
    // Count current requests
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiration
    pipeline.expire(key, Math.ceil(config.windowMs / 1000));
    
    const results = await pipeline.exec();
    
    if (!results) {
      throw new Error('Redis pipeline failed');
    }

    const currentCount = results[1][1] as number;
    
    if (currentCount >= config.maxRequests) {
      // Get oldest request to calculate reset time
      const oldest = await this.redis!.zrange(key, 0, 0, 'WITHSCORES');
      const oldestTime = oldest.length > 0 ? parseInt(oldest[1]) : now;
      const resetAt = new Date(oldestTime + config.windowMs);
      const retryAfter = Math.ceil((resetAt.getTime() - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter,
      };
    }

    return {
      allowed: true,
      remaining: config.maxRequests - currentCount - 1,
      resetAt: new Date(now + config.windowMs),
    };
  }

  private async checkWithMemory(
    key: string,
    config: RateLimitConfig,
    now: number,
    windowStart: number
  ): Promise<RateLimitResult> {
    // Simple in-memory implementation for development
    const memoryStore = (global as any).__rateLimitStore || new Map();
    (global as any).__rateLimitStore = memoryStore;

    const requests = memoryStore.get(key) || [];
    const validRequests = requests.filter((time: number) => time > windowStart);

    if (validRequests.length >= config.maxRequests) {
      const oldestRequest = Math.min(...validRequests);
      const resetAt = new Date(oldestRequest + config.windowMs);
      const retryAfter = Math.ceil((resetAt.getTime() - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter,
      };
    }

    // Add current request
    validRequests.push(now);
    memoryStore.create(key, validRequests);

    return {
      allowed: true,
      remaining: config.maxRequests - validRequests.length,
      resetAt: new Date(now + config.windowMs),
    };
  }

  async reset(key: string): Promise<void> {
    if (this.redis && this.isConnected) {
      await this.redis.del(key);
    } else {
      const memoryStore = (global as any).__rateLimitStore;
      if (memoryStore) {
        memoryStore.delete(key);
      }
    }
  }

  async getRemaining(key: string, config: RateLimitConfig): Promise<number> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    if (this.redis && this.isConnected) {
      await this.redis.zremrangebyscore(key, '-inf', windowStart);
      const count = await this.redis.zcard(key);
      return Math.max(0, config.maxRequests - count);
    } else {
      const memoryStore = (global as any).__rateLimitStore;
      if (memoryStore) {
        const requests = memoryStore.get(key) || [];
        const validRequests = requests.filter((time: number) => time > windowStart);
        return Math.max(0, config.maxRequests - validRequests.length);
      }
    }

    return config.maxRequests;
  }
}

// Export singleton instance
export const redisRateLimiter = new RedisRateLimiter();

// Rate limit configurations
export const rateLimitConfigs = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts. Please try again later.',
  },
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    message: 'Too many requests. Please slow down.',
  },
  chat: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Chat rate limit exceeded. Please wait before sending another message.',
  },
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    message: 'Upload limit exceeded. Please try again later.',
  },
  admin: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    message: 'Admin operation limit exceeded.',
  },
} as const;

export type RateLimitType = keyof typeof rateLimitConfigs;
