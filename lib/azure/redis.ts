import Redis from 'ioredis';
import { azureConfig, getRedisConfig } from './config';
import { logger } from '@/lib/logging/logger';

// Initialize Redis client
const redisConfig = getRedisConfig();
const redis = new Redis({
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  tls: redisConfig.tls,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

// Event handlers
redis.on('connect', () => {
  logger.info('Connected to Azure Cache for Redis', {
    host: redisConfig.host,
    port: redisConfig.port
  });
});

redis.on('error', (error) => {
  logger.error('Redis connection error', error, {
    host: redisConfig.host,
    port: redisConfig.port
  });
});

redis.on('close', () => {
  logger.warn('Redis connection closed', {
    host: redisConfig.host,
    port: redisConfig.port
  });
});

// Redis service class
export class RedisService {
  constructor(private client: Redis) {}

  async get(key: string): Promise<string | null> {
    try {
      const value = await this.client.get(key);
      logger.debug('Redis GET operation', { key, found: value !== null });
      return value;
    } catch (error) {
      logger.error('Redis GET operation failed', error, { key });
      throw error;
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, value);
      } else {
        await this.client.create(key, value);
      }
      logger.debug('Redis SET operation', { key, ttlSeconds });
    } catch (error) {
      logger.error('Redis SET operation failed', error, { key, ttlSeconds });
      throw error;
    }
  }

  async del(key: string): Promise<number> {
    try {
      const result = await this.client.del(key);
      logger.debug('Redis DEL operation', { key, deletedCount: result });
      return result;
    } catch (error) {
      logger.error('Redis DEL operation failed', error, { key });
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      logger.debug('Redis EXISTS operation', { key, exists: result === 1 });
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS operation failed', error, { key });
      throw error;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, ttlSeconds);
      logger.debug('Redis EXPIRE operation', { key, ttlSeconds, success: result === 1 });
      return result === 1;
    } catch (error) {
      logger.error('Redis EXPIRE operation failed', error, { key, ttlSeconds });
      throw error;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      const result = await this.client.ttl(key);
      logger.debug('Redis TTL operation', { key, ttl: result });
      return result;
    } catch (error) {
      logger.error('Redis TTL operation failed', error, { key });
      throw error;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      const result = await this.client.keys(pattern);
      logger.debug('Redis KEYS operation', { pattern, count: result.length });
      return result;
    } catch (error) {
      logger.error('Redis KEYS operation failed', error, { pattern });
      throw error;
    }
  }

  async flushdb(): Promise<void> {
    try {
      await this.client.flushdb();
      logger.info('Redis database flushed');
    } catch (error) {
      logger.error('Redis FLUSHDB operation failed', error);
      throw error;
    }
  }

  async info(section?: string): Promise<string> {
    try {
      const result = await this.client.info(section);
      logger.debug('Redis INFO operation', { section });
      return result;
    } catch (error) {
      logger.error('Redis INFO operation failed', error, { section });
      throw error;
    }
  }

  async ping(): Promise<string> {
    try {
      const result = await this.client.ping();
      logger.debug('Redis PING operation', { response: result });
      return result;
    } catch (error) {
      logger.error('Redis PING operation failed', error);
      throw error;
    }
  }

  // Hash operations
  async hget(key: string, field: string): Promise<string | null> {
    try {
      const result = await this.client.hget(key, field);
      logger.debug('Redis HGET operation', { key, field, found: result !== null });
      return result;
    } catch (error) {
      logger.error('Redis HGET operation failed', error, { key, field });
      throw error;
    }
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    try {
      const result = await this.client.hset(key, field, value);
      logger.debug('Redis HSET operation', { key, field, result });
      return result;
    } catch (error) {
      logger.error('Redis HSET operation failed', error, { key, field });
      throw error;
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    try {
      const result = await this.client.hgetall(key);
      logger.debug('Redis HGETALL operation', { key, fieldCount: Object.keys(result).length });
      return result;
    } catch (error) {
      logger.error('Redis HGETALL operation failed', error, { key });
      throw error;
    }
  }

  async hdel(key: string, field: string): Promise<number> {
    try {
      const result = await this.client.hdel(key, field);
      logger.debug('Redis HDEL operation', { key, field, deletedCount: result });
      return result;
    } catch (error) {
      logger.error('Redis HDEL operation failed', error, { key, field });
      throw error;
    }
  }

  // List operations
  async lpush(key: string, ...values: string[]): Promise<number> {
    try {
      const result = await this.client.lpush(key, ...values);
      logger.debug('Redis LPUSH operation', { key, valueCount: values.length, newLength: result });
      return result;
    } catch (error) {
      logger.error('Redis LPUSH operation failed', error, { key, valueCount: values.length });
      throw error;
    }
  }

  async rpush(key: string, ...values: string[]): Promise<number> {
    try {
      const result = await this.client.rpush(key, ...values);
      logger.debug('Redis RPUSH operation', { key, valueCount: values.length, newLength: result });
      return result;
    } catch (error) {
      logger.error('Redis RPUSH operation failed', error, { key, valueCount: values.length });
      throw error;
    }
  }

  async lpop(key: string): Promise<string | null> {
    try {
      const result = await this.client.lpop(key);
      logger.debug('Redis LPOP operation', { key, popped: result });
      return result;
    } catch (error) {
      logger.error('Redis LPOP operation failed', error, { key });
      throw error;
    }
  }

  async rpop(key: string): Promise<string | null> {
    try {
      const result = await this.client.rpop(key);
      logger.debug('Redis RPOP operation', { key, popped: result });
      return result;
    } catch (error) {
      logger.error('Redis RPOP operation failed', error, { key });
      throw error;
    }
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      const result = await this.client.lrange(key, start, stop);
      logger.debug('Redis LRANGE operation', { key, start, stop, count: result.length });
      return result;
    } catch (error) {
      logger.error('Redis LRANGE operation failed', error, { key, start, stop });
      throw error;
    }
  }

  // Set operations
  async sadd(key: string, ...members: string[]): Promise<number> {
    try {
      const result = await this.client.sadd(key, ...members);
      logger.debug('Redis SADD operation', { key, memberCount: members.length, addedCount: result });
      return result;
    } catch (error) {
      logger.error('Redis SADD operation failed', error, { key, memberCount: members.length });
      throw error;
    }
  }

  async smembers(key: string): Promise<string[]> {
    try {
      const result = await this.client.smembers(key);
      logger.debug('Redis SMEMBERS operation', { key, memberCount: result.length });
      return result;
    } catch (error) {
      logger.error('Redis SMEMBERS operation failed', error, { key });
      throw error;
    }
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    try {
      const result = await this.client.srem(key, ...members);
      logger.debug('Redis SREM operation', { key, memberCount: members.length, removedCount: result });
      return result;
    } catch (error) {
      logger.error('Redis SREM operation failed', error, { key, memberCount: members.length });
      throw error;
    }
  }

  // Sorted set operations
  async zadd(key: string, score: number, member: string): Promise<number> {
    try {
      const result = await this.client.zadd(key, score, member);
      logger.debug('Redis ZADD operation', { key, score, member, result });
      return result;
    } catch (error) {
      logger.error('Redis ZADD operation failed', error, { key, score, member });
      throw error;
    }
  }

  async zrange(key: string, start: number, stop: number, withScores: boolean = false): Promise<string[]> {
    try {
      const result = withScores 
        ? await this.client.zrange(key, start, stop, 'WITHSCORES')
        : await this.client.zrange(key, start, stop);
      logger.debug('Redis ZRANGE operation', { key, start, stop, withScores, count: result.length });
      return result;
    } catch (error) {
      logger.error('Redis ZRANGE operation failed', error, { key, start, stop, withScores });
      throw error;
    }
  }

  async zrem(key: string, ...members: string[]): Promise<number> {
    try {
      const result = await this.client.zrem(key, ...members);
      logger.debug('Redis ZREM operation', { key, memberCount: members.length, removedCount: result });
      return result;
    } catch (error) {
      logger.error('Redis ZREM operation failed', error, { key, memberCount: members.length });
      throw error;
    }
  }

  // Close connection
  async disconnect(): Promise<void> {
    try {
      await this.client.disconnect();
      logger.info('Redis connection disconnected');
    } catch (error) {
      logger.error('Failed to disconnect Redis', error);
      throw error;
    }
  }
}

// Create Redis service instance
export const redisService = new RedisService(redis);

// Export the client for advanced operations
export { redis as redisClient };
