import { NextRequest, NextResponse } from 'next/server';
import { azureAuthService } from '@/lib/azure/auth';
import { logger } from '@/lib/logger';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  companyId: string;
  permissions: string[];
}

export interface AuthContext {
  user: AuthenticatedUser;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasCompanyAccess: (companyId: string) => boolean;
}

/**
 * Authentication middleware for API routes
 */
export async function authenticateRequest(request: NextRequest): Promise<{
  user: AuthenticatedUser | null;
  error: NextResponse | null;
}> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return {
        user: null,
        error: NextResponse.json(
          { error: 'Missing or invalid authorization header' },
          { status: 401 }
        )
      };
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Verify token with Azure AD B2C
    const user = await azureAuthService.validateToken(token);
    
    if (!user) {
      return {
        user: null,
        error: NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        )
      };
    }

    logger.info('User authenticated successfully', {
      userId: user.user?.id,
      email: user.user?.email,
      roles: user.user?.roles
    });

    return { user: user.user || null, error: null };

  } catch (error) {
    logger.error('Authentication failed', {
      path: request.nextUrl.pathname,
      method: request.method,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      user: null,
      error: NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      )
    };
  }
}

/**
 * Role-based access control middleware
 */
export function requireRole(requiredRoles: string | string[]) {
  return (user: AuthenticatedUser): boolean => {
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    return roles.some(role => user.roles.includes(role));
  };
}

/**
 * Permission-based access control middleware
 */
export function requirePermission(requiredPermissions: string | string[]) {
  return (user: AuthenticatedUser): boolean => {
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    return permissions.some(permission => user.permissions.includes(permission));
  };
}

/**
 * Company access control middleware
 */
export function requireCompanyAccess(companyId: string) {
  return (user: AuthenticatedUser): boolean => {
    // Super admins can access any company
    if (user.roles.includes('super-admin')) {
      return true;
    }
    
    // Users can only access their own company
    return user.companyId === companyId;
  };
}

/**
 * Admin endpoint protection middleware
 */
export async function protectAdminEndpoint(request: NextRequest): Promise<{
  user: AuthenticatedUser | null;
  error: NextResponse | null;
}> {
  const { user, error } = await authenticateRequest(request);
  
  if (error || !user) {
    return { user: null, error };
  }

  // Check if user has admin role
  const adminRoles = ['platform-admin', 'company-admin', 'super-admin'];
  if (!adminRoles.some(role => user.roles.includes(role))) {
    logger.securityEvent('Unauthorized admin access attempt', {
      userId: user.id,
      email: user.email,
      roles: user.roles,
      path: request.nextUrl.pathname,
      userAgent: request.headers.get('user-agent')
    });

    return {
      user: null,
      error: NextResponse.json(
        { error: 'Insufficient permissions for admin access' },
        { status: 403 }
      )
    };
  }

  return { user, error: null };
}

/**
 * Super admin endpoint protection middleware
 */
export async function protectSuperAdminEndpoint(request: NextRequest): Promise<{
  user: AuthenticatedUser | null;
  error: NextResponse | null;
}> {
  const { user, error } = await authenticateRequest(request);
  
  if (error || !user) {
    return { user: null, error };
  }

  // Check if user has super admin role
  if (!user.roles.includes('super-admin')) {
    logger.securityEvent('Unauthorized super admin access attempt', {
      userId: user.id,
      email: user.email,
      roles: user.roles,
      path: request.nextUrl.pathname,
      userAgent: request.headers.get('user-agent')
    });

    return {
      user: null,
      error: NextResponse.json(
        { error: 'Insufficient permissions for super admin access' },
        { status: 403 }
      )
    };
  }

  return { user, error: null };
}

/**
 * Company-specific endpoint protection middleware
 */
export async function protectCompanyEndpoint(
  request: NextRequest,
  companyId: string
): Promise<{
  user: AuthenticatedUser | null;
  error: NextResponse | null;
}> {
  const { user, error } = await authenticateRequest(request);
  
  if (error || !user) {
    return { user: null, error };
  }

  // Check company access
  if (!requireCompanyAccess(companyId)(user)) {
    logger.securityEvent('Unauthorized company access attempt', {
      userId: user.id,
      email: user.email,
      userCompanyId: user.companyId,
      requestedCompanyId: companyId,
      path: request.nextUrl.pathname,
      userAgent: request.headers.get('user-agent')
    });

    return {
      user: null,
      error: NextResponse.json(
        { error: 'Access denied to company resources' },
        { status: 403 }
      )
    };
  }

  return { user, error: null };
}

/**
 * Add user context to request headers for downstream processing
 */
export function addUserContext(request: NextRequest, user: AuthenticatedUser): NextRequest {
  const headers = new Headers(request.headers);
  
  headers.set('x-user-id', user.id);
  headers.set('x-user-email', user.email);
  headers.set('x-user-name', user.name);
  headers.set('x-user-roles', user.roles.join(','));
  headers.set('x-company-id', user.companyId);
  headers.set('x-user-permissions', user.permissions.join(','));
  
  return new NextRequest(request.url, {
    method: request.method,
    headers,
    body: request.body
  });
}

/**
 * Extract user context from request headers
 */
export function extractUserContext(request: NextRequest): AuthenticatedUser | null {
  const userId = request.headers.get('x-user-id');
  const email = request.headers.get('x-user-email');
  const name = request.headers.get('x-user-name');
  const roles = request.headers.get('x-user-roles')?.split(',') || [];
  const companyId = request.headers.get('x-company-id');
  const permissions = request.headers.get('x-user-permissions')?.split(',') || [];

  if (!userId || !email || !companyId) {
    return null;
  }

  return {
    id: userId,
    email,
    name: name || email,
    roles,
    companyId,
    permissions
  };
}

/**
 * Audit log for security events
 */
export function logSecurityEvent(
  event: string,
  details: Record<string, any>,
  user?: AuthenticatedUser
) {
  logger.securityEvent(event, {
    ...details,
    userId: user?.id,
    userEmail: user?.email,
    userRoles: user?.roles,
    timestamp: new Date().toISOString()
  });
}
