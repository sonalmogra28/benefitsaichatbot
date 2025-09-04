/**
 * Error tracking and monitoring service
 * Captures, logs, and reports errors throughout the application
 */

import { logger } from './logger.service';
import { adminDb, FieldValue as AdminFieldValue } from '@/lib/firebase/admin';
import { getConfig, isProduction } from '@/config/environments';

export interface ErrorContext {
  userId?: string;
  companyId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
  action?: string;
  component?: string;
  metadata?: Record<string, any>;
}

export interface TrackedError {
  id?: string;
  timestamp: Date;
  environment: string;
  errorType: 'client' | 'server' | 'api' | 'validation' | 'network' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  context?: ErrorContext;
  fingerprint: string; // For grouping similar errors
  count?: number; // For error frequency tracking
}

class ErrorTracker {
  private static instance: ErrorTracker;
  private config = getConfig();
  private errorQueue: TrackedError[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Start flush interval in production
    if (this.config.monitoring.enableErrorTracking) {
      this.startFlushInterval();
    }
  }

  public static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  private startFlushInterval(): void {
    // Flush errors to database every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushErrors();
    }, 30000);
  }

  private generateFingerprint(error: Error, context?: ErrorContext): string {
    // Create a unique fingerprint for error grouping
    const parts = [
      error.name,
      error.message.substring(0, 100),
      context?.component || 'unknown',
      context?.action || 'unknown',
    ];

    // Simple hash function
    return parts.join('|').replace(/[^a-zA-Z0-9|]/g, '');
  }

  private determineSeverity(
    error: Error,
    errorType: TrackedError['errorType'],
  ): TrackedError['severity'] {
    // Determine severity based on error type and message
    if (error.message.includes('CRITICAL') || error.message.includes('FATAL')) {
      return 'critical';
    }

    if (
      errorType === 'server' ||
      error.name === 'TypeError' ||
      error.name === 'ReferenceError'
    ) {
      return 'high';
    }

    if (errorType === 'api' || errorType === 'network') {
      return 'medium';
    }

    return 'low';
  }

  private async flushErrors(): Promise<void> {
    if (this.errorQueue.length === 0) return;

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    try {
      // Group errors by fingerprint
      const grouped = errors.reduce(
        (acc, error) => {
          if (!acc[error.fingerprint]) {
            acc[error.fingerprint] = { ...error, count: 1 };
          } else {
            acc[error.fingerprint].count =
              (acc[error.fingerprint].count || 0) + 1;
          }
          return acc;
        },
        {} as Record<string, TrackedError>,
      );

      // Save to Firestore
      const batch = adminDb.batch();

      Object.values(grouped).forEach((error) => {
        const docRef = adminDb.collection('errors').doc();
        batch.set(docRef, {
          ...error,
          timestamp: AdminFieldValue.serverTimestamp(),
        });
      });

      await batch.commit();

      logger.info(
        `Flushed ${Object.keys(grouped).length} unique errors to database`,
      );
    } catch (error) {
      logger.error('Failed to flush errors to database', error as Error);
    }
  }

  public track(
    error: Error,
    errorType: TrackedError['errorType'] = 'unknown',
    context?: ErrorContext,
  ): void {
    const fingerprint = this.generateFingerprint(error, context);
    const severity = this.determineSeverity(error, errorType);

    const trackedError: TrackedError = {
      timestamp: new Date(),
      environment: this.config.name,
      errorType,
      severity,
      message: error.message,
      stack: error.stack,
      context,
      fingerprint,
    };

    // Log the error
    logger.error(`${errorType} error tracked`, error, context);

    // Add to queue for batch processing
    if (this.config.monitoring.enableErrorTracking) {
      this.errorQueue.push(trackedError);

      // Immediate flush for critical errors
      if (severity === 'critical') {
        this.flushErrors();
      }
    }

    // Send alerts for critical errors in production
    if (isProduction() && severity === 'critical') {
      this.sendAlert(trackedError);
    }
  }

  public trackApiError(
    endpoint: string,
    method: string,
    statusCode: number,
    error: Error,
    context?: ErrorContext,
  ): void {
    const enhancedContext: ErrorContext = {
      ...context,
      metadata: {
        ...context?.metadata,
        endpoint,
        method,
        statusCode,
      },
    };

    this.track(error, 'api', enhancedContext);
  }

  public trackClientError(
    error: Error,
    component: string,
    context?: ErrorContext,
  ): void {
    const enhancedContext: ErrorContext = {
      ...context,
      component,
    };

    this.track(error, 'client', enhancedContext);
  }

  public trackValidationError(
    field: string,
    value: any,
    error: Error,
    context?: ErrorContext,
  ): void {
    const enhancedContext: ErrorContext = {
      ...context,
      metadata: {
        ...context?.metadata,
        field,
        invalidValue:
          typeof value === 'object'
            ? '[object]'
            : String(value).substring(0, 100),
      },
    };

    this.track(error, 'validation', enhancedContext);
  }

  private async sendAlert(error: TrackedError): Promise<void> {
    // In production, this would send alerts via email, Slack, PagerDuty, etc.
    logger.error('CRITICAL ERROR ALERT', undefined, {
      metadata: {
        severity: error.severity,
        message: error.message,
        fingerprint: error.fingerprint,
      },
    });

    // Store critical errors in a special collection for immediate attention
    try {
      await adminDb.collection('critical_errors').add({
        ...error,
        timestamp: AdminFieldValue.serverTimestamp(),
        alerted: true,
      });
    } catch (err) {
      logger.error('Failed to save critical error', err as Error);
    }
  }

  public async getErrorStats(hours = 24): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    topErrors: Array<{ fingerprint: string; count: number; message: string }>;
  }> {
    try {
      const since = new Date();
      since.setHours(since.getHours() - hours);

      const snapshot = await adminDb
        .collection('errors')
        .where('timestamp', '>=', since)
        .get();

      const errors = snapshot.docs.map((doc) => doc.data() as TrackedError);

      // Calculate statistics
      const stats = {
        total: errors.length,
        bySeverity: {} as Record<string, number>,
        byType: {} as Record<string, number>,
        topErrors: [] as Array<{
          fingerprint: string;
          count: number;
          message: string;
        }>,
      };

      const errorCounts: Record<string, { count: number; message: string }> =
        {};

      errors.forEach((error) => {
        // Count by severity
        stats.bySeverity[error.severity] =
          (stats.bySeverity[error.severity] || 0) + 1;

        // Count by type
        stats.byType[error.errorType] =
          (stats.byType[error.errorType] || 0) + 1;

        // Count by fingerprint
        if (!errorCounts[error.fingerprint]) {
          errorCounts[error.fingerprint] = { count: 0, message: error.message };
        }
        errorCounts[error.fingerprint].count += error.count || 1;
      });

      // Get top errors
      stats.topErrors = Object.entries(errorCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 10)
        .map(([fingerprint, data]) => ({
          fingerprint,
          count: data.count,
          message: data.message,
        }));

      return stats;
    } catch (error) {
      logger.error('Failed to get error statistics', error as Error);
      throw error;
    }
  }

  public destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Final flush
    this.flushErrors();
  }
}

// Export singleton instance
export const errorTracker = ErrorTracker.getInstance();

// Export convenience functions
export const trackError = (
  error: Error,
  type?: TrackedError['errorType'],
  context?: ErrorContext,
) => errorTracker.track(error, type, context);

export const trackApiError = (
  endpoint: string,
  method: string,
  statusCode: number,
  error: Error,
  context?: ErrorContext,
) => errorTracker.trackApiError(endpoint, method, statusCode, error, context);

export const trackClientError = (
  error: Error,
  component: string,
  context?: ErrorContext,
) => errorTracker.trackClientError(error, component, context);
