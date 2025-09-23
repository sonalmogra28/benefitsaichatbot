/**
 * Server-side authentication utilities for server components
 */

import { cookies, headers } from 'next/headers';
import { validateToken } from '@/lib/azure/token-validation';
import { logger } from '@/lib/logger';

export interface ServerUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  companyId: string;
  permissions: string[];
}

/**
 * Get authenticated user from server-side context
 * This function can be used in server components and server actions
 */
export async function getServerUser(): Promise<ServerUser | null> {
  try {
    // Try to get token from Authorization header first
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1];
      const validationResult = await validateToken(token);
      
      if (validationResult?.valid && validationResult.user) {
        return {
          id: validationResult.user.id,
          email: validationResult.user.email,
          name: validationResult.user.name,
          roles: validationResult.user.roles,
          companyId: validationResult.user.companyId,
          permissions: validationResult.user.permissions,
        };
      }
    }

    // Try to get token from cookies as fallback
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session-token')?.value;
    
    if (sessionToken) {
      const validationResult = await validateToken(sessionToken);
      
      if (validationResult?.valid && validationResult.user) {
        return {
          id: validationResult.user.id,
          email: validationResult.user.email,
          name: validationResult.user.name,
          roles: validationResult.user.roles,
          companyId: validationResult.user.companyId,
          permissions: validationResult.user.permissions,
        };
      }
    }

    // Try to get user info from custom headers (set by middleware)
    const userId = headersList.get('x-user-id');
    const email = headersList.get('x-user-email');
    const name = headersList.get('x-user-name');
    const roles = headersList.get('x-user-roles')?.split(',') || [];
    const companyId = headersList.get('x-company-id');
    const permissions = headersList.get('x-user-permissions')?.split(',') || [];

    if (userId && email && companyId) {
      return {
        id: userId,
        email,
        name: name || email,
        roles,
        companyId,
        permissions,
      };
    }

    logger.warn('No valid authentication found in server context');
    return null;

  } catch (error) {
    logger.error('Failed to get server user', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}

/**
 * Require authentication in server components
 * Throws an error if user is not authenticated
 */
export async function requireServerAuth(): Promise<ServerUser> {
  const user = await getServerUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }
  
  return user;
}

/**
 * Check if user has specific role
 */
export async function hasServerRole(role: string): Promise<boolean> {
  const user = await getServerUser();
  return user?.roles.includes(role) ?? false;
}

/**
 * Check if user has specific permission
 */
export async function hasServerPermission(permission: string): Promise<boolean> {
  const user = await getServerUser();
  return user?.permissions.includes(permission) ?? false;
}

/**
 * Check if user has access to specific company
 */
export async function hasServerCompanyAccess(companyId: string): Promise<boolean> {
  const user = await getServerUser();
  return user?.companyId === companyId ?? false;
}
