import type { RateLimiter, RateLimitResult } from './index';

/**
 * Simple sliding window counter
 */
interface WindowCounter {
  count: number;
  windowStart: number;
  timestamps: number[];
}

/**
 * In-memory rate limiter implementation
 * WARNING: This is not suitable for production use with multiple instances
 */
export class MemoryRateLimiter implements RateLimiter {
  private counters: Map<string, WindowCounter> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up old entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  async check(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create counter
    let counter = this.counters.get(key);
    if (!counter) {
      counter = {
        count: 0,
        windowStart: now,
        timestamps: [],
      };
      this.counters.set(key, counter);
    }

    // Remove timestamps outside the window
    counter.timestamps = counter.timestamps.filter((ts) => ts > windowStart);

    // Check if limit exceeded
    if (counter.timestamps.length >= limit) {
      const oldestTimestamp = counter.timestamps[0];
      const resetAt = new Date(oldestTimestamp + windowMs);
      const retryAfter = (resetAt.getTime() - now) / 1000;

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter,
      };
    }

    // Add current timestamp
    counter.timestamps.push(now);

    return {
      allowed: true,
      remaining: limit - counter.timestamps.length,
      resetAt: new Date(now + windowMs),
    };
  }

  async reset(key: string): Promise<void> {
    this.counters.delete(key);
  }

  /**
   * Clean up old entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const [key, counter] of this.counters.entries()) {
      // Remove if no recent activity
      if (
        counter.timestamps.length === 0 ||
        counter.timestamps[counter.timestamps.length - 1] < now - maxAge
      ) {
        this.counters.delete(key);
      }
    }
  }

  /**
   * Destroy the rate limiter and clean up resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.counters.clear();
  }
}
