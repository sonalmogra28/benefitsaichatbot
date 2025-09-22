/**
 * Simple Logger Service for Hybrid Architecture
 * Replaces complex Firebase-based logging with simple console logging
 */

export interface LogContext {
  [key: string]: any;
}

export class SimpleLogger {
  static info(message: string, context?: LogContext) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, context || '');
  }

  static warn(message: string, context?: LogContext) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, context || '');
  }

  static error(message: string, error?: unknown, context?: LogContext) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, {
      error: errorMessage,
      ...context
    });
  }

  static debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, context || '');
    }
  }
}

// Export as default logger for compatibility
export const logger = SimpleLogger;
