import { adminDb, FieldValue as AdminFieldValue, Timestamp as AdminTimestamp } from '@/lib/firebase/admin';
import type { RateLimiter, RateLimitResult } from './index';

/**
 * Firestore-based rate limiter implementation
 * Uses sliding window counter algorithm with Firestore
 */
export class FirestoreRateLimiter implements RateLimiter {
  private collection = 'rate_limits';
  
  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    try {
      // Use Firestore transaction for atomic operations
      const result = await adminDb.runTransaction(async (transaction) => {
        const docRef = adminDb.collection(this.collection).doc(key);
        const doc = await transaction.get(docRef);
        
        let attempts: number[] = [];
        
        if (doc.exists) {
          const data = doc.data();
          // Filter out old attempts outside the window
          attempts = (data?.attempts || []).filter((timestamp: number) => timestamp > windowStart);
        }
        
        // Check if limit is exceeded
        if (attempts.length >= limit) {
          const oldestAttempt = Math.min(...attempts);
          const resetAt = new Date(oldestAttempt + windowMs);
          const retryAfter = (resetAt.getTime() - now) / 1000;
          
          return {
            allowed: false,
            remaining: 0,
            resetAt,
            retryAfter,
          };
        }
        
        // Add current attempt
        attempts.push(now);
        
        // Update document with new attempts and set TTL
        transaction.set(docRef, {
          attempts,
          expiresAt: AdminTimestamp.fromMillis(now + windowMs),
          lastUpdated: AdminFieldValue.serverTimestamp(),
        });
        
        return {
          allowed: true,
          remaining: limit - attempts.length,
          resetAt: new Date(now + windowMs),
        };
      });
      
      return result;
    } catch (error) {
      console.error('Firestore rate limit error:', error);
      
      // On error, allow the request but log it
      return {
        allowed: true,
        remaining: limit,
        resetAt: new Date(now + windowMs),
      };
    }
  }
  
  async reset(key: string): Promise<void> {
    try {
      await adminDb.collection(this.collection).doc(key).delete();
    } catch (error) {
      console.error('Firestore reset error:', error);
    }
  }
  
  /**
   * Clean up expired rate limit documents
   * Should be called periodically (e.g., via Cloud Scheduler)
   */
  async cleanupExpired(): Promise<void> {
    try {
      const now = AdminTimestamp.now();
      const snapshot = await adminDb
        .collection(this.collection)
        .where('expiresAt', '<', now)
        .limit(500) // Process in batches
        .get();
      
      const batch = adminDb.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`Cleaned up ${snapshot.size} expired rate limit entries`);
    } catch (error) {
      console.error('Firestore cleanup error:', error);
    }
  }
}

/**
 * In-memory rate limiter for development/testing
 * Falls back to memory storage when Firestore is unavailable
 */
export class InMemoryRateLimiter implements RateLimiter {
  private attempts = new Map<string, number[]>();
  
  async check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Get existing attempts
    let userAttempts = this.attempts.get(key) || [];
    
    // Filter out old attempts
    userAttempts = userAttempts.filter(timestamp => timestamp > windowStart);
    
    // Check if limit is exceeded
    if (userAttempts.length >= limit) {
      const oldestAttempt = Math.min(...userAttempts);
      const resetAt = new Date(oldestAttempt + windowMs);
      const retryAfter = (resetAt.getTime() - now) / 1000;
      
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter,
      };
    }
    
    // Add current attempt
    userAttempts.push(now);
    this.attempts.set(key, userAttempts);
    
    // Schedule cleanup
    setTimeout(() => {
      const attempts = this.attempts.get(key) || [];
      const filtered = attempts.filter(t => t > Date.now() - windowMs);
      if (filtered.length === 0) {
        this.attempts.delete(key);
      } else {
        this.attempts.set(key, filtered);
      }
    }, windowMs);
    
    return {
      allowed: true,
      remaining: limit - userAttempts.length,
      resetAt: new Date(now + windowMs),
    };
  }
  
  async reset(key: string): Promise<void> {
    this.attempts.delete(key);
  }
}