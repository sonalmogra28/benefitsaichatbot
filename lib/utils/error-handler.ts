/**
 * Central error handler
 * TODO: Add proper error tracking service (e.g., Sentry) when available
 */

export function handleError(error: unknown): {
  message: string;
  statusCode: number;
} {
  console.error('Error occurred:', error);

  // Basic error handling without Sentry for now
  if (error instanceof Error) {
    // Log to console instead of Sentry
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

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
  console.error('Error logged:', {
    error,
    context,
    timestamp: new Date().toISOString(),
  });
}
