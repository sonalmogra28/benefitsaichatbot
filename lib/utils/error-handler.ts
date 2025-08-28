/**
 * Central error handler
 * TODO: Add proper error tracking service (e.g., Sentry) when available
 */

import { logger } from '@/lib/services/logger.service';

export function handleError(error: unknown): {
  message: string;
  statusCode: number;
} {
  // Use logger service instead of console
  logger.error('Error occurred', error instanceof Error ? error : new Error(String(error)));

  // Basic error handling without Sentry for now
  if (error instanceof Error) {
    return {
      message: error.message || 'An unexpected error occurred',
      statusCode: 500,
    };
  }

  return {
    message: 'An unexpected error occurred',
    statusCode: 500,
  };
}

export function logError(error: unknown, context?: Record<string, any>): void {
  const errorInstance = error instanceof Error ? error : new Error(String(error));
  logger.error('Error logged', errorInstance, {
    metadata: {
      ...context,
      timestamp: new Date().toISOString(),
    },
  });
}
