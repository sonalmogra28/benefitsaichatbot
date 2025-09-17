import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { logger } from '@/lib/logging/logger';

export interface ValidationResult<T> {
  data: T | null;
  error?: NextResponse;
}

/**
 * Generic validation function for request bodies
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (request: NextRequest): Promise<ValidationResult<T>> => {
    try {
      const body = await request.json();
      const validatedData = schema.parse(body);
      return { data: validatedData };
    } catch (error) {
      logger.error('Body validation failed', {
        error: error instanceof Error ? error.message : String(error),
        path: request.nextUrl.pathname,
        method: request.method,
      });

      if (error instanceof z.ZodError) {
        const errorResponse = NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          },
          { status: 400 }
        );
        return { data: null, error: errorResponse };
      }

      const errorResponse = NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
      return { data: null, error: errorResponse };
    }
  };
}

/**
 * Generic validation function for query parameters
 */
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (request: NextRequest): ValidationResult<T> => {
    try {
      const { searchParams } = new URL(request.url);
      const queryObject = Object.fromEntries(searchParams.entries());
      const validatedData = schema.parse(queryObject);
      return { data: validatedData };
    } catch (error) {
      logger.error('Query validation failed', {
        error: error instanceof Error ? error.message : String(error),
        path: request.nextUrl.pathname,
        method: request.method,
      });

      if (error instanceof z.ZodError) {
        const errorResponse = NextResponse.json(
          {
            error: 'Invalid query parameters',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          },
          { status: 400 }
        );
        return { data: null, error: errorResponse };
      }

      const errorResponse = NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      );
      return { data: null, error: errorResponse };
    }
  };
}

/**
 * Generic validation function for URL parameters
 */
export function validateParams<T>(schema: z.ZodSchema<T>) {
  return (params: Record<string, string>): ValidationResult<T> => {
    try {
      const validatedData = schema.parse(params);
      return { data: validatedData };
    } catch (error) {
      logger.error('Params validation failed', {
        error: error instanceof Error ? error.message : String(error),
        params,
      });

      if (error instanceof z.ZodError) {
        const errorResponse = NextResponse.json(
          {
            error: 'Invalid URL parameters',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          },
          { status: 400 }
        );
        return { data: null, error: errorResponse };
      }

      const errorResponse = NextResponse.json(
        { error: 'Invalid URL parameters' },
        { status: 400 }
      );
      return { data: null, error: errorResponse };
    }
  };
}

/**
 * Validation middleware factory for API routes
 */
export function createValidationMiddleware<TBody, TQuery, TParams>(config: {
  body?: z.ZodSchema<TBody>;
  query?: z.ZodSchema<TQuery>;
  params?: z.ZodSchema<TParams>;
}) {
  return async (
    request: NextRequest,
    params?: Record<string, string>
  ): Promise<{
    body?: TBody;
    query?: TQuery;
    params?: TParams;
    error?: NextResponse;
  }> => {
    const result: {
      body?: TBody;
      query?: TQuery;
      params?: TParams;
      error?: NextResponse;
    } = {};

    // Validate body
    if (config.body) {
      const bodyResult = await validateBody(config.body)(request);
      if (bodyResult.error) {
        return { error: bodyResult.error };
      }
      result.body = bodyResult.data!;
    }

    // Validate query
    if (config.query) {
      const queryResult = validateQuery(config.query)(request);
      if (queryResult.error) {
        return { error: queryResult.error };
      }
      result.query = queryResult.data!;
    }

    // Validate params
    if (config.params && params) {
      const paramsResult = validateParams(config.params)(params);
      if (paramsResult.error) {
        return { error: paramsResult.error };
      }
      result.params = paramsResult.data!;
    }

    return result;
  };
}

/**
 * Sanitize and validate user input
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 10000); // Limit length
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate date string
 */
export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Common validation schemas for reuse
 */
export const commonValidationSchemas = {
  id: z.string().min(1, 'ID is required'),
  email: z.string().email('Invalid email format'),
  uuid: z.string().uuid('Invalid UUID format'),
  date: z.string().datetime('Invalid date format'),
  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
  }),
  search: z.object({
    query: z.string().min(1, 'Search query is required'),
    filters: z.record(z.any()).optional(),
  }),
};
