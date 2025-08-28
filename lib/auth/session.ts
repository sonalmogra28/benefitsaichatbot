/**
 * Firebase session management utilities
 * Handles authentication token verification and user session management
 */

import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface SessionUser extends DecodedIdToken {
  role?: string;
  companyId?: string;
  permissions?: string[];
}

/**
 * Retrieves and validates the current user session from cookies
 * @returns Decoded user token or null if invalid/missing
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    
    // Check for session token in cookies
    const sessionCookie = cookieStore.get('__session');
    const tokenCookie = cookieStore.get('token');
    const authToken = sessionCookie?.value || tokenCookie?.value;

    if (!authToken) {
      return null;
    }

    // Verify the Firebase ID token
    const decodedToken = await adminAuth.verifyIdToken(authToken);
    
    // Add custom claims to the session user object
    const sessionUser: SessionUser = {
      ...decodedToken,
      role: decodedToken.role || decodedToken['custom_claims']?.role || 'employee',
      companyId: decodedToken.companyId || decodedToken['custom_claims']?.companyId,
      permissions: decodedToken.permissions || decodedToken['custom_claims']?.permissions || []
    };

    return sessionUser;
  } catch (error) {
    // Token is invalid, expired, or verification failed
    return null;
  }
}

/**
 * Retrieves session from Authorization header (for API routes)
 * @param request - Next.js Request object
 * @returns Decoded user token or null if invalid/missing
 */
export async function getSessionFromHeader(request: Request): Promise<SessionUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Add custom claims to the session user object
    const sessionUser: SessionUser = {
      ...decodedToken,
      role: decodedToken.role || decodedToken['custom_claims']?.role || 'employee',
      companyId: decodedToken.companyId || decodedToken['custom_claims']?.companyId,
      permissions: decodedToken.permissions || decodedToken['custom_claims']?.permissions || []
    };

    return sessionUser;
  } catch (error) {
    return null;
  }
}

/**
 * Sets a session cookie with the provided token
 * @param token - Firebase ID token
 * @param expiresIn - Session duration in milliseconds (default 5 days)
 */
export async function setSession(token: string, expiresIn: number = 60 * 60 * 24 * 5 * 1000) {
  const cookieStore = cookies();
  
  // Create session cookie with secure settings
  cookieStore.set('__session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: expiresIn / 1000, // Convert to seconds
    path: '/'
  });
}

/**
 * Clears the user session by removing cookies
 */
export async function clearSession() {
  const cookieStore = cookies();
  
  // Remove all possible session cookies
  cookieStore.delete('__session');
  cookieStore.delete('token');
}

/**
 * Validates if a user has a specific role
 * @param user - Session user object
 * @param requiredRole - Role to check
 * @returns Boolean indicating if user has the role
 */
export function hasRole(user: SessionUser | null, requiredRole: string): boolean {
  if (!user) return false;
  
  const roleHierarchy: Record<string, number> = {
    'super-admin': 4,
    'platform-admin': 3,
    'company-admin': 2,
    'hr-admin': 1,
    'employee': 0
  };

  const userLevel = roleHierarchy[user.role || 'employee'] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
}

/**
 * Validates if a user has a specific permission
 * @param user - Session user object
 * @param permission - Permission to check
 * @returns Boolean indicating if user has the permission
 */
export function hasPermission(user: SessionUser | null, permission: string): boolean {
  if (!user) return false;
  
  // Super admins have all permissions
  if (user.role === 'super-admin') return true;
  
  return user.permissions?.includes(permission) || false;
}

/**
 * Middleware helper to require authentication
 * @param handler - API route handler
 * @returns Wrapped handler with auth check
 */
export function requireAuth(
  handler: (req: Request, context: any, user: SessionUser) => Promise<Response>
) {
  return async (req: Request, context: any) => {
    const user = await getSessionFromHeader(req);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return handler(req, context, user);
  };
}

/**
 * Middleware helper to require a specific role
 * @param role - Required role
 * @param handler - API route handler
 * @returns Wrapped handler with role check
 */
export function requireRole(
  role: string,
  handler: (req: Request, context: any, user: SessionUser) => Promise<Response>
) {
  return async (req: Request, context: any) => {
    const user = await getSessionFromHeader(req);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!hasRole(user, role)) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return handler(req, context, user);
  };
}