export interface RateLimiter {
  check(key: string, config: { max: number; windowMs: number }): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }>;
}

export class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, { count: number; resetTime: number }>();

  async check(key: string, config: { max: number; windowMs: number }): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // First request or window expired
      this.store.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });

      return {
        allowed: true,
        remaining: config.max - 1,
        resetAt: new Date(now + config.windowMs),
      };
    }

    if (entry.count >= config.max) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(entry.resetTime),
      };
    }

    // Increment count
    entry.count++;
    this.store.set(key, entry);

    return {
      allowed: true,
      remaining: config.max - entry.count,
      resetAt: new Date(entry.resetTime),
    };
  }
}
