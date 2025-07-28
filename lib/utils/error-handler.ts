/**
 * Central error handler
 * TODO: Add proper error tracking service (e.g., Sentry) when available
 */
export function handleError(error: unknown, context: string) {
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${context}]`, error);
  }
  
  // Log to structured logging in production
  if (process.env.NODE_ENV === 'production') {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error),
      level: 'error'
    }));
  }
}
