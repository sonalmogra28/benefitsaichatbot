/**
 * Unified Authentication Middleware
 * Provides type-safe authentication for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { UnifiedAuth, AuthenticatedUser } from './unified-auth';

// Extended request interface with user information
export interface AuthenticatedRequest extends NextRequest {
  user: AuthenticatedUser;
}

// Higher-order function for authentication
export function withAuth(
  requiredRoles?: string | string[],
  requiredPermissions?: string | string[]
) {
  return function <T extends any[]>(
    handler: (request: AuthenticatedRequest, ...args: T) => Promise<NextResponse>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
      const authResult = await UnifiedAuth.authenticateRequest(request);
      
      if (!authResult.isAuthenticated || !authResult.user) {
        return authResult.error || NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Check role requirements
      if (requiredRoles) {
        const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
        if (!UnifiedAuth.hasAnyRole(authResult.user, roles)) {
          UnifiedAuth.logSecurityEvent('Unauthorized role access attempt', {
            requiredRoles: roles,
            userRoles: authResult.user.roles,
            path: request.nextUrl.pathname,
            method: request.method,
          }, authResult.user);

          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          );
        }
      }

      // Check permission requirements
      if (requiredPermissions) {
        const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
        if (!UnifiedAuth.hasAnyPermission(authResult.user, permissions)) {
          UnifiedAuth.logSecurityEvent('Unauthorized permission access attempt', {
            requiredPermissions: permissions,
            userPermissions: authResult.user.permissions,
            path: request.nextUrl.pathname,
            method: request.method,
          }, authResult.user);

          return NextResponse.json(
            { error: 'Insufficient permissions' },
            { status: 403 }
          );
        }
      }

      // Create authenticated request with user context
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = authResult.user;

      return handler(authenticatedRequest, ...args);
    };
  };
}

// Convenience functions for common use cases
export const withAdminAuth = withAuth(['super_admin', 'platform_admin']);
export const withCompanyAdminAuth = withAuth(['company_admin', 'hr_admin']);
export const withHRAdminAuth = withAuth('hr_admin');
export const withEmployeeAuth = withAuth('employee');

// Permission-based functions
export const withUserManagement = withAuth(undefined, ['manage_users']);
export const withAnalytics = withAuth(undefined, ['view_analytics']);
export const withBenefitsManagement = withAuth(undefined, ['manage_benefits']);
