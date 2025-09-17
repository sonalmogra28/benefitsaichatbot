/**
 * Input validation middleware for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { handleAPIError } from '@/lib/errors/api-errors';

export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (request: NextRequest): Promise<{ data: T; error?: NextResponse }> => {
    try {
      const body = await request.json();
      const data = schema.parse(body);
      return { data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorResponse = NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        );
        return { data: null as T, error: errorResponse };
      }
      
      const apiError = handleAPIError(error);
      const errorResponse = NextResponse.json(
        { error: apiError.message, code: apiError.code },
        { status: apiError.statusCode }
      );
      return { data: null as T, error: errorResponse };
    }
  };
}

export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (request: NextRequest): { data: T; error?: NextResponse } => {
    try {
      const { searchParams } = new URL(request.url);
      const queryObject = Object.fromEntries(searchParams.entries());
      const data = schema.parse(queryObject);
      return { data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorResponse = NextResponse.json(
          {
            error: 'Query validation failed',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        );
        return { data: null as T, error: errorResponse };
      }
      
      const apiError = handleAPIError(error);
      const errorResponse = NextResponse.json(
        { error: apiError.message, code: apiError.code },
        { status: apiError.statusCode }
      );
      return { data: null as T, error: errorResponse };
    }
  };
}

export function validateParams<T>(schema: z.ZodSchema<T>) {
  return (params: Record<string, string>): { data: T; error?: NextResponse } => {
    try {
      const data = schema.parse(params);
      return { data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorResponse = NextResponse.json(
          {
            error: 'Parameter validation failed',
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
            })),
          },
          { status: 400 }
        );
        return { data: null as T, error: errorResponse };
      }
      
      const apiError = handleAPIError(error);
      const errorResponse = NextResponse.json(
        { error: apiError.message, code: apiError.code },
        { status: apiError.statusCode }
      );
      return { data: null as T, error: errorResponse };
    }
  };
}

// Alias for backward compatibility
export const validateQueryParams = validateQuery;

// Common validation schemas
export const commonSchemas = {
  id: z.string().min(1, 'ID is required'),
  email: z.string().email('Invalid email format'),
  role: z.enum(['employee', 'hr-admin', 'company-admin', 'platform-admin', 'super-admin']),
  pagination: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
  }),
  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
};
