import { type NextRequest, NextResponse } from 'next/server';
import { auth, type UserType } from '@/app/(auth)/stack-auth';
import { setTenantContext } from '@/lib/db/tenant-utils';

export type AuthenticatedHandler<T = any> = (
  request: NextRequest,
  context: T & { session: NonNullable<Awaited<ReturnType<typeof auth>>> }
) => Promise<Response> | Response;

/**
 * Middleware wrapper for API route authentication and authorization
 * @param handler - The route handler function
 * @param requiredRoles - Array of roles that can access this endpoint (empty = any authenticated user)
 * @returns Wrapped handler with authentication
 */
export function withAuth<T = any>(
  handler: AuthenticatedHandler<T>,
  requiredRoles: UserType[] = []
) {
  return async (request: NextRequest, context?: T): Promise<Response> => {
    try {
      // Get the authenticated session
      const session = await auth();
      
      // Check if user is authenticated
      if (!session?.user) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required',
              details: { reason: 'No valid session found' }
            }
          },
          { status: 401 }
        );
      }
      
      // Check role-based authorization if roles are specified
      if (requiredRoles.length > 0 && !requiredRoles.includes(session.user.type)) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Insufficient permissions',
              details: { 
                requiredRoles,
                userRole: session.user.type 
              }
            }
          },
          { status: 403 }
        );
      }
      
      // Set tenant context for row-level security
      await setTenantContext(
        session.user.id,
        session.user.companyId
      );
      
      // Log API access for audit trail
      console.log(JSON.stringify({
        level: 'audit',
        action: 'api_access',
        userId: session.user.id,
        userRole: session.user.type,
        endpoint: request.url,
        method: request.method,
        timestamp: new Date().toISOString(),
      }));
      
      // Call the handler with authenticated context
      return await handler(request, { ...context, session } as T & { session: NonNullable<typeof session> });
      
    } catch (error) {
      console.error('Auth middleware error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Authentication error',
            details: process.env.NODE_ENV === 'development' ? error : undefined
          }
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Middleware wrapper specifically for platform admin endpoints
 */
export function withPlatformAdmin<T = any>(handler: AuthenticatedHandler<T>) {
  return withAuth(handler, ['platform_admin']);
}

/**
 * Middleware wrapper for company admin endpoints (includes HR admin and platform admin)
 */
export function withCompanyAdmin<T = any>(handler: AuthenticatedHandler<T>) {
  return withAuth(handler, ['company_admin', 'hr_admin', 'platform_admin']);
}

/**
 * Middleware wrapper for any admin role
 */
export function withAnyAdmin<T = any>(handler: AuthenticatedHandler<T>) {
  return withAuth(handler, ['hr_admin', 'company_admin', 'platform_admin']);
}

/**
 * Helper to extract and validate API keys for service-to-service auth
 */
export async function validateApiKey(request: NextRequest): Promise<boolean> {
  const apiKey = request.headers.get('x-api-key');
  
  if (!apiKey) {
    return false;
  }
  
  // In production, validate against stored API keys
  // For now, check against environment variable
  const validApiKey = process.env.INTERNAL_API_KEY;
  
  return apiKey === validApiKey;
}

/**
 * Middleware for cron job endpoints
 */
export function withCronAuth<T = any>(
  handler: (request: NextRequest, context?: T) => Promise<Response> | Response
) {
  return async (request: NextRequest, context?: T): Promise<Response> => {
    // Check for cron secret in authorization header
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      // Also check for valid API key as fallback
      const hasValidApiKey = await validateApiKey(request);
      
      if (!hasValidApiKey) {
        return NextResponse.json(
          { 
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Invalid cron authentication'
            }
          },
          { status: 401 }
        );
      }
    }
    
    return handler(request, context);
  };
}