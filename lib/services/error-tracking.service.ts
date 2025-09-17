import { logger } from '@/lib/logging/logger';

export interface ErrorEvent {
  id: string;
  message: string;
  level: 'error' | 'warning' | 'info' | 'debug';
  context?: Record<string, any>;
  userId?: string;
  companyId?: string;
  timestamp: Date;
}

export class ErrorTrackingService {
  private errors: ErrorEvent[] = [];
  private readonly maxErrors = 1000;

  /**
   * Track an error event
   */
  trackError(
    error: Error | string,
    level: 'error' | 'warning' | 'info' | 'debug' = 'error',
    context?: Record<string, any>
  ): string {
    const errorEvent: ErrorEvent = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: typeof error === 'string' ? error : error.message,
      level,
      context,
      timestamp: new Date()
    };

    this.errors.push(errorEvent);

    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log the error
    logger.error('Error tracked', {
      errorId: errorEvent.id,
      message: errorEvent.message,
      level: errorEvent.level,
      context: errorEvent.context
    });

    return errorEvent.id;
  }

  /**
   * Track an error with user context
   */
  trackUserError(
    error: Error | string,
    userId: string,
    companyId?: string,
    level: 'error' | 'warning' | 'info' | 'debug' = 'error',
    context?: Record<string, any>
  ): string {
    const errorEvent: ErrorEvent = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: typeof error === 'string' ? error : error.message,
      level,
      context,
      userId,
      companyId,
      timestamp: new Date()
    };

    this.errors.push(errorEvent);

    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    // Log the error
    logger.error('User error tracked', {
      errorId: errorEvent.id,
      message: errorEvent.message,
      level: errorEvent.level,
      userId,
      companyId,
      context: errorEvent.context
    });

    return errorEvent.id;
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 50): ErrorEvent[] {
    return this.errors
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get errors for a specific user
   */
  getUserErrors(userId: string, limit: number = 50): ErrorEvent[] {
    return this.errors
      .filter(e => e.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get errors for a specific company
   */
  getCompanyErrors(companyId: string, limit: number = 50): ErrorEvent[] {
    return this.errors
      .filter(e => e.companyId === companyId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}

// Export singleton instance
export const errorTrackingService = new ErrorTrackingService();