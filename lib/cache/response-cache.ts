import Redis from 'ioredis';
import { logger } from '@/lib/logging/logger';

const REDIS_URL = process.env.REDIS_URL;
const CACHE_TTL_SECONDS = 3600; // Cache for 1 hour

let redisClient: Redis | null = null;

if (REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error', { error: err });
      // Prevent further commands on critical errors
      if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
        redisClient?.disconnect();
      }
    });

    redisClient.on('connect', () => {
      logger.info('Successfully connected to Redis.');
    });
  } catch (error) {
    logger.error('Failed to initialize Redis client', { error });
  }
} else {
  logger.warn('REDIS_URL not found. Response caching is disabled.');
}

class ResponseCache {
  private client: Redis | null;

  constructor(client: Redis | null) {
    this.client = client;
  }

  private generateCacheKey(query: string, companyId: string): string {
    // Simple key generation. For production, consider a more robust hashing mechanism.
    return `response_cache:${companyId}:${query.trim().toLowerCase()}`;
  }

  async get(query: string, companyId: string): Promise<string | null> {
    if (!this.client) return null;

    try {
      const key = this.generateCacheKey(query, companyId);
      return await this.client.get(key);
    } catch (error) {
      logger.error('Redis GET error', { error });
      return null;
    }
  }

  async set(query: string, companyId: string, response: string): Promise<void> {
    if (!this.client || !response) return;

    try {
      const key = this.generateCacheKey(query, companyId);
      await this.client.create(key, response, 'EX', CACHE_TTL_SECONDS);
    } catch (error) {
      logger.error('Redis SET error', { error });
    }
  }
}

export const responseCache = new ResponseCache(redisClient);
