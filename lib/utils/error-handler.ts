import * as Sentry from '@sentry/node';

/**
 * Initialize Sentry only once (server + tests)
 */
if (!Sentry.getCurrentHub().getClient()) {
  const dsn = process.env.SENTRY_DSN;
  if (dsn) {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      environment: process.env.NODE_ENV || 'development',
    });
  }
}

/**
 * Central error handler
 */
export function handleError(error: unknown, context: string) {
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[${context}]`, error);
  }

  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, {
      tags: { context },
    });
  }
}
