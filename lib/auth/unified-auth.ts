/**
 * Unified Authentication System
 * Consolidates all authentication patterns into a single, secure system
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { USER_ROLES } from '@/lib/constants/roles';

// Unified user interface
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  companyId: string;
  permissions: string[];
  metadata?: Record<string, any>;
}

// Authentication result interface
export interface AuthResult {
  user: AuthenticatedUser | null;
  error: NextResponse | null;
  isAuthenticated: boolean;
}

// Role-based permissions
export const PERMISSIONS = {
  // Admin permissions
  MANAGE_USERS: 'manage_users',
  MANAGE_COMPANIES: 'manage_companies',
  MANAGE_BENEFITS: 'manage_benefits',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_SETTINGS: 'manage_settings',
  
  // Employee permissions
  VIEW_BENEFITS: 'view_benefits',
  ENROLL_BENEFITS: 'enroll_benefits',
  CHAT_WITH_AI: 'chat_with_ai',
  VIEW_DOCUMENTS: 'view_documents',
  
  // Company admin permissions
  MANAGE_EMPLOYEES: 'manage_employees',
  VIEW_COMPANY_ANALYTICS: 'view_company_analytics',
  MANAGE_COMPANY_BENEFITS: 'manage_company_benefits',
} as const;

// Role to permissions mapping
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  [USER_ROLES.SUPER_ADMIN]: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_COMPANIES,
    PERMISSIONS.MANAGE_BENEFITS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.MANAGE_EMPLOYEES,
    PERMISSIONS.VIEW_COMPANY_ANALYTICS,
    PERMISSIONS.MANAGE_COMPANY_BENEFITS,
  ],
  [USER_ROLES.PLATFORM_ADMIN]: [
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_BENEFITS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.MANAGE_SETTINGS,
  ],
  [USER_ROLES.COMPANY_ADMIN]: [
    PERMISSIONS.MANAGE_EMPLOYEES,
    PERMISSIONS.VIEW_COMPANY_ANALYTICS,
    PERMISSIONS.MANAGE_COMPANY_BENEFITS,
    PERMISSIONS.VIEW_BENEFITS,
    PERMISSIONS.CHAT_WITH_AI,
    PERMISSIONS.VIEW_DOCUMENTS,
  ],
  [USER_ROLES.HR_ADMIN]: [
    PERMISSIONS.MANAGE_EMPLOYEES,
    PERMISSIONS.VIEW_COMPANY_ANALYTICS,
    PERMISSIONS.VIEW_BENEFITS,
    PERMISSIONS.CHAT_WITH_AI,
    PERMISSIONS.VIEW_DOCUMENTS,
  ],
  [USER_ROLES.EMPLOYEE]: [
    PERMISSIONS.VIEW_BENEFITS,
    PERMISSIONS.ENROLL_BENEFITS,
    PERMISSIONS.CHAT_WITH_AI,
    PERMISSIONS.VIEW_DOCUMENTS,
  ],
};

/**
 * Unified authentication middleware
 */
export class UnifiedAuth {
  /**
   * Authenticate request and extract user information
   */
  static async authenticateRequest(request: NextRequest): Promise<AuthResult> {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.get('authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return {
          user: null,
          error: NextResponse.json(
            { error: 'Missing or invalid authorization header' },
            { status: 401 }
          ),
          isAuthenticated: false,
        };
      }

      const token = authHeader.split('Bearer ')[1];
      
      // Validate token with Azure AD B2C
      const user = await this.validateToken(token);
      
      if (!user) {
        return {
          user: null,
          error: NextResponse.json(
            { error: 'Invalid or expired token' },
            { status: 401 }
          ),
          isAuthenticated: false,
        };
      }

      logger.info('User authenticated successfully', {
        userId: user.id,
        email: user.email,
        roles: user.roles,
        companyId: user.companyId,
      });

      return {
        user,
        error: null,
        isAuthenticated: true,
      };

    } catch (error) {
      logger.error('Authentication failed', {
        path: request.nextUrl.pathname,
        method: request.method,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        user: null,
        error: NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        ),
        isAuthenticated: false,
      };
    }
  }

  /**
   * Validate JWT token using Azure AD B2C
   */
  private static async validateToken(token: string): Promise<AuthenticatedUser | null> {
    try {
      // Import the token validation service
      const { validateToken: validateAzureToken } = await import('@/lib/azure/token-validation');
      
      // Validate the token with Azure AD B2C
      const validationResult = await validateAzureToken(token);
      
      if (!validationResult?.valid || !validationResult.user) {
        logger.warn('Token validation failed', {
          error: validationResult?.error || 'Invalid token'
        });
        return null;
      }

      const { user } = validationResult;
      
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        companyId: user.companyId,
        permissions: user.permissions,
        metadata: {},
      };
    } catch (error) {
      logger.error('Token validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Check if user has specific role
   */
  static hasRole(user: AuthenticatedUser, role: string): boolean {
    return user.roles.includes(role);
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(user: AuthenticatedUser, permission: string): boolean {
    return user.permissions.includes(permission);
  }

  /**
   * Check if user has any of the specified roles
   */
  static hasAnyRole(user: AuthenticatedUser, roles: string[]): boolean {
    return roles.some(role => user.roles.includes(role));
  }

  /**
   * Check if user has any of the specified permissions
   */
  static hasAnyPermission(user: AuthenticatedUser, permissions: string[]): boolean {
    return permissions.some(permission => user.permissions.includes(permission));
  }

  /**
   * Check if user can access company resources
   */
  static canAccessCompany(user: AuthenticatedUser, companyId: string): boolean {
    // Super admins can access any company
    if (this.hasRole(user, USER_ROLES.SUPER_ADMIN)) {
      return true;
    }
    
    // Users can only access their own company
    return user.companyId === companyId;
  }

  /**
   * Get user permissions for a specific role
   */
  static getPermissionsForRole(role: string): string[] {
    return ROLE_PERMISSIONS[role] || [];
  }

  /**
   * Create middleware for role-based access control
   */
  static requireRole(requiredRoles: string | string[]) {
    return (user: AuthenticatedUser): boolean => {
      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      return this.hasAnyRole(user, roles);
    };
  }

  /**
   * Create middleware for permission-based access control
   */
  static requirePermission(requiredPermissions: string | string[]) {
    return (user: AuthenticatedUser): boolean => {
      const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
      return this.hasAnyPermission(user, permissions);
    };
  }

  /**
   * Log security events
   */
  static logSecurityEvent(
    event: string,
    details: Record<string, any>,
    user?: AuthenticatedUser
  ) {
    logger.securityEvent(event, {
      ...details,
      userId: user?.id,
      userEmail: user?.email,
      userRoles: user?.roles,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Higher-order function to protect API routes
 */
export function withAuth(
  requiredRoles?: string | string[],
  requiredPermissions?: string | string[]
) {
  return function <T extends any[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
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

      // Add user to request context
      const headers = new Headers(request.headers);
      headers.set('x-user-id', authResult.user.id);
      headers.set('x-user-email', authResult.user.email);
      headers.set('x-user-name', authResult.user.name);
      headers.set('x-user-roles', authResult.user.roles.join(','));
      headers.set('x-company-id', authResult.user.companyId);
      headers.set('x-user-permissions', authResult.user.permissions.join(','));

      const modifiedRequest = new NextRequest(request.url, {
        method: request.method,
        headers,
        body: request.body,
      });

      return handler(modifiedRequest, ...args);
    };
  };
}

// Convenience functions for common use cases
export const requireSuperAdmin = withAuth(USER_ROLES.SUPER_ADMIN);
export const requirePlatformAdmin = withAuth(USER_ROLES.PLATFORM_ADMIN);
export const requireCompanyAdmin = withAuth(USER_ROLES.COMPANY_ADMIN);
export const requireHRAdmin = withAuth(USER_ROLES.HR_ADMIN);
export const requireEmployee = withAuth(USER_ROLES.EMPLOYEE);

// Permission-based functions
export const requireUserManagement = withAuth(undefined, [PERMISSIONS.MANAGE_USERS]);
export const requireAnalytics = withAuth(undefined, [PERMISSIONS.VIEW_ANALYTICS]);
export const requireBenefitsManagement = withAuth(undefined, [PERMISSIONS.MANAGE_BENEFITS]);
