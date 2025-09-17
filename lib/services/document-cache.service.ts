 import { redisService } from '@/lib/azure/redis';
import { logger } from '@/lib/logging/logger';

export interface CachedDocumentChunk {
  id: string;
  content: string;
  documentId: string;
  chunkIndex: number;
  metadata?: any;
  score?: number;
}

export class DocumentCacheService {
  private readonly CACHE_PREFIX = 'doc_chunk:';
  private readonly SEARCH_PREFIX = 'doc_search:';
  private readonly TTL = 3600; // 1 hour

  /**
   * Cache document chunks for fast retrieval
   */
  async cacheDocumentChunks(
    companyId: string,
    documentId: string,
    chunks: CachedDocumentChunk[]
  ): Promise<void> {
    try {
      const key = `${this.CACHE_PREFIX}${companyId}:${documentId}`;
      await redisService.setex(key, this.TTL, JSON.stringify(chunks));
      
      logger.info('Document chunks cached', {
        companyId,
        documentId,
        chunkCount: chunks.length
      });
    } catch (error) {
      logger.error('Failed to cache document chunks', error as Error, {
        companyId,
        documentId
      });
    }
  }

  /**
   * Get cached document chunks
   */
  async getCachedDocumentChunks(
    companyId: string,
    documentId: string
  ): Promise<CachedDocumentChunk[] | null> {
    try {
      const key = `${this.CACHE_PREFIX}${companyId}:${documentId}`;
      const cached = await redisService.get(key);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to get cached document chunks', error as Error, {
        companyId,
        documentId
      });
      return null;
    }
  }

  /**
   * Cache search results for common queries
   */
  async cacheSearchResults(
    companyId: string,
    query: string,
    results: CachedDocumentChunk[]
  ): Promise<void> {
    try {
      const normalizedQuery = query.toLowerCase().trim();
      const key = `${this.SEARCH_PREFIX}${companyId}:${Buffer.from(normalizedQuery).toString('base64')}`;
      await redisService.setex(key, this.TTL, JSON.stringify(results));
      
      logger.info('Search results cached', {
        companyId,
        query: normalizedQuery,
        resultCount: results.length
      });
    } catch (error) {
      logger.error('Failed to cache search results', error as Error, {
        companyId,
        query
      });
    }
  }

  /**
   * Get cached search results
   */
  async getCachedSearchResults(
    companyId: string,
    query: string
  ): Promise<CachedDocumentChunk[] | null> {
    try {
      const normalizedQuery = query.toLowerCase().trim();
      const key = `${this.SEARCH_PREFIX}${companyId}:${Buffer.from(normalizedQuery).toString('base64')}`;
      const cached = await redisService.get(key);
      
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to get cached search results', error as Error, {
        companyId,
        query
      });
      return null;
    }
  }

  /**
   * Invalidate cache for a specific document
   */
  async invalidateDocumentCache(
    companyId: string,
    documentId: string
  ): Promise<void> {
    try {
      const key = `${this.CACHE_PREFIX}${companyId}:${documentId}`;
      await redisService.del(key);
      
      logger.info('Document cache invalidated', {
        companyId,
        documentId
      });
    } catch (error) {
      logger.error('Failed to invalidate document cache', error as Error, {
        companyId,
        documentId
      });
    }
  }

  /**
   * Clear all cache for a company
   */
  async clearCompanyCache(companyId: string): Promise<void> {
    try {
      const pattern = `${this.CACHE_PREFIX}${companyId}:*`;
      const searchPattern = `${this.SEARCH_PREFIX}${companyId}:*`;
      
      // Get all keys matching the patterns
      const cacheKeys = await redisService.keys(pattern);
      const searchKeys = await redisService.keys(searchPattern);
      
      if (cacheKeys.length > 0) {
        await redisService.del(...cacheKeys);
      }
      
      if (searchKeys.length > 0) {
        await redisService.del(...searchKeys);
      }
      
      logger.info('Company cache cleared', {
        companyId,
        cacheKeysDeleted: cacheKeys.length,
        searchKeysDeleted: searchKeys.length
      });
    } catch (error) {
      logger.error('Failed to clear company cache', error as Error, {
        companyId
      });
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(companyId: string): Promise<{
    documentCaches: number;
    searchCaches: number;
    totalKeys: number;
  }> {
    try {
      const cachePattern = `${this.CACHE_PREFIX}${companyId}:*`;
      const searchPattern = `${this.SEARCH_PREFIX}${companyId}:*`;
      
      const cacheKeys = await redisService.keys(cachePattern);
      const searchKeys = await redisService.keys(searchPattern);
      
      return {
        documentCaches: cacheKeys.length,
        searchCaches: searchKeys.length,
        totalKeys: cacheKeys.length + searchKeys.length
      };
    } catch (error) {
      logger.error('Failed to get cache stats', error as Error, {
        companyId
      });
      return {
        documentCaches: 0,
        searchCaches: 0,
        totalKeys: 0
      };
    }
  }
}

export const documentCacheService = new DocumentCacheService();
