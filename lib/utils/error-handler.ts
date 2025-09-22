/**
 * Error handling utilities for hybrid architecture
 * Provides safe error handling and logging
 */

export interface ErrorContext {
  [key: string]: any;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return 'Unknown error occurred';
}

export function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.stack;
  }
  if (error && typeof error === 'object' && 'stack' in error) {
    return String((error as any).stack);
  }
  return undefined;
}

export function getErrorCode(error: unknown): string | number | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as any).code;
  }
  return undefined;
}

export function isErrorWithCode(error: unknown): error is Error & { code: string | number } {
  return error instanceof Error && 'code' in error;
}

export function createSafeErrorContext(error: unknown, context?: ErrorContext): ErrorContext {
  return {
    errorMessage: getErrorMessage(error),
    errorCode: getErrorCode(error),
    errorStack: getErrorStack(error),
    ...context,
  };
}

export function logErrorSafely(
  logger: { error: (message: string, error?: unknown, context?: ErrorContext) => void },
  message: string,
  error: unknown,
  context?: ErrorContext
): void {
  const safeContext = createSafeErrorContext(error, context);
  logger.error(message, error instanceof Error ? error : undefined, safeContext);
}