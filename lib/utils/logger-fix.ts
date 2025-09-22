/**
 * Logger Fix Utility - Replaces all logger.error calls with safe error handling
 */

import { SimpleLogger } from '../services/simple-logger';
import { createSafeErrorContext } from './error-handler';

// Safe logger wrapper that handles unknown error types
export const safeLogger = {
  error: (message: string, error?: unknown, context?: Record<string, any>) => {
    const safeContext = createSafeErrorContext(error, context);
    SimpleLogger.error(message, error instanceof Error ? error : undefined, safeContext);
  },
  
  warn: (message: string, context?: Record<string, any>) => {
    SimpleLogger.warn(message, context);
  },
  
  info: (message: string, context?: Record<string, any>) => {
    SimpleLogger.info(message, context);
  },
  
  debug: (message: string, context?: Record<string, any>) => {
    SimpleLogger.debug(message, context);
  }
};

// Global logger replacement
export const logger = safeLogger;
