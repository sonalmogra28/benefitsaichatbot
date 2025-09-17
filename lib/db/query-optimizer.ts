/**
 * Database query optimization utilities
 */

import { adminDb } from '@/lib/azure/admin';
import { logger } from '@/lib/logging/logger';

interface QueryOptions {
  limit?: number;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  where?: Array<{ field: string; operator: any; value: any }>;
  select?: string[];
}

export class QueryOptimizer {
  /**
   * Optimized query for user documents with caching
   */
  static async getUsers(companyId: string, options: QueryOptions = {}) {
    const startTime = Date.now();
    
    try {
      let query = adminDb.collection('companies').getById(companyId).collection('users');
      
      // Apply filters
      if (options.where) {
        options.where.forEach(condition => {
          query = query.query(condition.field, condition.operator, condition.value);
        });
      }
      
      // Apply ordering
      if (options.orderBy) {
        query = query.query(options.orderBy.field, options.orderBy.direction);
      }
      
      // Apply limit
      if (options.limit) {
        query = query.query(options.limit);
      }
      
      const snapshot = await query.get();
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      const duration = Date.now() - startTime;
      logger.performanceMetric('database_query', duration, 'ms', {
        collection: 'users',
        companyId,
        resultCount: users.length,
      });
      
      return users;
    } catch (error) {
      logger.error('Database query error', {
        error: error instanceof Error ? error.message : String(error),
        collection: 'users',
        companyId,
      });
      throw error;
    }
  }

  /**
   * Optimized query for conversations with pagination
   */
  static async getConversations(
    companyId: string,
    userId: string,
    options: QueryOptions = {}
  ) {
    const startTime = Date.now();
    
    try {
      let query = adminDb
        .collection('companies')
        .getById(companyId)
        .collection('conversations')
        .query('userId', '==', userId);
      
      // Apply ordering
      if (options.orderBy) {
        query = query.query(options.orderBy.field, options.orderBy.direction);
      } else {
        // Default ordering by updatedAt
        query = query.query('updatedAt', 'desc');
      }
      
      // Apply limit
      if (options.limit) {
        query = query.query(options.limit);
      }
      
      const snapshot = await query.get();
      const conversations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      const duration = Date.now() - startTime;
      logger.performanceMetric('database_query', duration, 'ms', {
        collection: 'conversations',
        companyId,
        userId,
        resultCount: conversations.length,
      });
      
      return conversations;
    } catch (error) {
      logger.error('Database query error', {
        error: error instanceof Error ? error.message : String(error),
        collection: 'conversations',
        companyId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Batch operations for better performance
   */
  static async batchUpdate(
    updates: Array<{
      collection: string;
      docId: string;
      data: any;
    }>
  ) {
    const startTime = Date.now();
    
    try {
      const batch = adminDb.batch();
      
      updates.forEach(({ collection, docId, data }) => {
        const docRef = adminDb.collection(collection).getById(docId);
        batch.update(docRef, data);
      });
      
      await batch.commit();
      
      const duration = Date.now() - startTime;
      logger.performanceMetric('batch_update', duration, 'ms', {
        operationCount: updates.length,
      });
      
      return { success: true, count: updates.length };
    } catch (error) {
      logger.error('Batch update error', {
        error: error instanceof Error ? error.message : String(error),
        updateCount: updates.length,
      });
      throw error;
    }
  }

  /**
   * Get document with caching
   */
  static async getDocument(
    collection: string,
    docId: string,
    useCache: boolean = true
  ) {
    const startTime = Date.now();
    
    try {
      // Simple in-memory cache for development
      if (useCache && process.env.NODE_ENV === 'development') {
        const cacheKey = `${collection}:${docId}`;
        const cached = (global as any).__docCache?.[cacheKey];
        if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
          return cached.data;
        }
      }
      
      const doc = await adminDb.collection(collection).getById(docId).get();
      
      if (!doc.exists) {
        return null;
      }
      
      const data = { id: doc.id, ...doc.data() };
      
      // Cache the result
      if (useCache && process.env.NODE_ENV === 'development') {
        if (!(global as any).__docCache) {
          (global as any).__docCache = {};
        }
        (global as any).__docCache[`${collection}:${docId}`] = {
          data,
          timestamp: Date.now(),
        };
      }
      
      const duration = Date.now() - startTime;
      logger.performanceMetric('document_get', duration, 'ms', {
        collection,
        docId,
        cached: false,
      });
      
      return data;
    } catch (error) {
      logger.error('Document get error', {
        error: error instanceof Error ? error.message : String(error),
        collection,
        docId,
      });
      throw error;
    }
  }

  /**
   * Search with text indexing
   */
  static async searchDocuments(
    companyId: string,
    searchTerm: string,
    collection: string = 'documents'
  ) {
    const startTime = Date.now();
    
    try {
      // For now, use basic Firestore query
      // In production, consider using Algolia or Elasticsearch
      const query = adminDb
        .collection('companies')
        .getById(companyId)
        .collection(collection)
        .query('searchableText', '>=', searchTerm)
        .query('searchableText', '<=', searchTerm + '\uf8ff')
        .query(20);
      
      const snapshot = await query.get();
      const results = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      const duration = Date.now() - startTime;
      logger.performanceMetric('search_query', duration, 'ms', {
        collection,
        companyId,
        searchTerm,
        resultCount: results.length,
      });
      
      return results;
    } catch (error) {
      logger.error('Search query error', {
        error: error instanceof Error ? error.message : String(error),
        collection,
        companyId,
        searchTerm,
      });
      throw error;
    }
  }
}
