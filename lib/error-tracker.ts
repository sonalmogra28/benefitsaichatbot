// Simple error tracking for production

export const ErrorTracker = {
  log(error: any, context?: any) {
    const errorData = {
      timestamp: new Date().toISOString(),
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      context,
      url: typeof window !== 'undefined' ? window.location.href : 'server',
      userAgent:
        typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ERROR TRACKED:', errorData);
    }

    // Send to logging endpoint
    if (typeof window !== 'undefined') {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      }).catch(() => {
        // Fail silently if error logging fails
      });
    }

    return errorData;
  },

  async init() {
    if (typeof window !== 'undefined') {
      // Capture unhandled errors
      window.addEventListener('error', (event) => {
        this.log(event.error, { type: 'unhandled' });
      });

      // Capture unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.log(event.reason, { type: 'unhandled-promise' });
      });
    }
  },
};

// Auto-initialize on client
if (typeof window !== 'undefined') {
  ErrorTracker.init();
}
