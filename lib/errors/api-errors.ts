/**
 * Centralized API error handling and custom error classes
 */
import { logger } from '../utils/logger-fix';

export class APIError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
export class ValidationError extends APIError {
  constructor(message: string, field?: string) {
    super(
      field ? `${field}: ${message}` : message,
      400,
      'VALIDATION_ERROR'
    );
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends APIError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends APIError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends APIError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends APIError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export class ExternalServiceError extends APIError {
  constructor(service: string, message: string) {
    super(`${service} error: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
  }
}

// Error handler for API routes
export function handleAPIError(error: unknown): {
  statusCode: number;
  message: string;
  code: string;
} {
  // Log the error for debugging
  logger.error('API Error:', error);

  if (error instanceof APIError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
      code: error.code,
    };
  }

  if (error instanceof Error) {
    // Handle known error types
    if (error.name === 'ValidationError') {
      return {
        statusCode: 400,
        message: error.message,
        code: 'VALIDATION_ERROR',
      };
    }

    if (error.name === 'FirebaseError') {
      return {
        statusCode: 400,
        message: 'Database operation failed',
        code: 'DATABASE_ERROR',
      };
    }

    // Generic error
    return {
      statusCode: 500,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    };
  }

  // Unknown error type
  return {
    statusCode: 500,
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  };
}

// Validation helper
export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', 'email');
  }
}

export function validateRole(role: string): void {
  const validRoles = ['employee', 'hr-admin', 'company-admin', 'platform-admin', 'super-admin'];
  if (!validRoles.includes(role)) {
    throw new ValidationError(`Invalid role: ${role}`, 'role');
  }
}
