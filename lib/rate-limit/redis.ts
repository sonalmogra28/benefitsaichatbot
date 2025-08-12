import { createClient, type RedisClientType } from 'redis';
import type { RateLimiter, RateLimitResult } from './index';

/**
 * Redis-based rate limiter implementation
 * Uses sliding window counter algorithm
 */
export class RedisRateLimiter implements RateLimiter {
  private client: RedisClientType;
  private connected: boolean = false;
  
  constructor(redisUrl: string) {
    this.client = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis connection failed after 10 retries');
            return false;
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });
    
    this.client.on('error', (err) => {
      console.error('Redis client error:', err);
      this.connected = false;
    });
    
    this.client.on('connect', () => {
      this.connected = true;
    });
    
    // Connect asynchronously
    this.connect();
  }
  
  private async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.connected = true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      this.connected = false;
    }
  }
  
  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    // If Redis is not connected, allow the request
    if (!this.connected) {
      console.warn('Redis not connected, allowing request');
      return {
        allowed: true,
        remaining: limit,
        resetAt: new Date(Date.now() + windowMs),
      };
    }
    
    const now = Date.now();
    const windowStart = now - windowMs;
    
    try {
      // Use Redis multi for atomic operations
      const multi = this.client.multi();
      
      // Remove old entries
      multi.zRemRangeByScore(key, '-inf', windowStart.toString());
      
      // Count current entries
      multi.zCard(key);
      
      // Add current timestamp
      multi.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
      
      // Set expiry
      multi.expire(key, Math.ceil(windowMs / 1000));
      
      // Execute transaction
      const results = await multi.exec();
      
      // Get the count before adding the new entry
      const count = results[1] as number;
      
      if (count >= limit) {
        // Get the oldest timestamp to calculate reset time
        const oldestEntries = await this.client.zRange(key, 0, 0, { 
          BY: 'SCORE',
          LIMIT: { offset: 0, count: 1 }
        });
        
        let resetAt: Date;
        let retryAfter: number;
        
        if (oldestEntries.length > 0) {
          const oldestTimestamp = parseInt(oldestEntries[0].split('-')[0]);
          resetAt = new Date(oldestTimestamp + windowMs);
          retryAfter = (resetAt.getTime() - now) / 1000;
        } else {
          resetAt = new Date(now + windowMs);
          retryAfter = windowMs / 1000;
        }
        
        // Remove the entry we just added since limit is exceeded
        await this.client.zRem(key, `${now}-${Math.random()}`);
        
        return {
          allowed: false,
          remaining: 0,
          resetAt,
          retryAfter,
        };
      }
      
      return {
        allowed: true,
        remaining: limit - count - 1,
        resetAt: new Date(now + windowMs),
      };
    } catch (error) {
      console.error('Redis rate limit error:', error);
      
      // On error, allow the request but log it
      return {
        allowed: true,
        remaining: limit,
        resetAt: new Date(now + windowMs),
      };
    }
  }
  
  async reset(key: string): Promise<void> {
    if (!this.connected) {
      return;
    }
    
    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Redis reset error:', error);
    }
  }
  
  /**
   * Close Redis connection
   */
  async destroy(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }
}