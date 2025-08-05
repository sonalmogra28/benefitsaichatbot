import { stackServerApp } from '@/stack';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { setTenantContext } from '@/lib/db/tenant-utils';
import type { AuthUser, AuthSession } from '@/app/(auth)/stack-auth';

/**
 * Authenticate user from Bearer token in Authorization header
 * Use this for API endpoints that need token-based authentication
 * 
 * For Stack Auth, we recommend using the existing cookie-based auth for most cases.
 * This function is for external API access where Bearer tokens are required.
 */
export async function authenticateFromToken(request: Request): Promise<AuthSession | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { user: null };
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Stack Auth token-based authentication using token store
    const stackUser = await stackServerApp.getUser({ 
      tokenStore: { 
        accessToken, 
        refreshToken: '' // Empty refresh token for API access
      } 
    });
    
    if (!stackUser) {
      return { user: null };
    }

    // Look up user in our database by Stack user ID
    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.stackUserId, stackUser.id))
      .limit(1);

    if (dbUsers.length === 0) {
      // User exists in Stack but not in our DB
      return {
        user: {
          id: stackUser.id,
          email: stackUser.primaryEmail || '',
          name: stackUser.displayName || undefined,
          type: 'employee', // Default type
          stackUserId: stackUser.id,
        },
      };
    }

    const [dbUser] = dbUsers;

    // Set tenant context for secure queries
    await setTenantContext(stackUser.id, dbUser.companyId);

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || undefined,
        type: (dbUser.role as AuthUser['type']) || 'employee',
        companyId: dbUser.companyId,
        stackUserId: dbUser.stackUserId,
      },
    };
  } catch (error) {
    console.error('Token auth error:', error);
    return null;
  }
}

/**
 * Require token authentication - throws if not authenticated
 */
export async function requireTokenAuth(request: Request): Promise<AuthUser> {
  const session = await authenticateFromToken(request);
  if (!session?.user) {
    throw new Error('Authentication required');
  }
  return session.user;
}

/**
 * Require specific role with token auth - throws if not authorized
 */
export async function requireTokenRole(
  request: Request,
  requiredRoles: AuthUser['type'][],
): Promise<AuthUser> {
  const user = await requireTokenAuth(request);
  if (!requiredRoles.includes(user.type)) {
    throw new Error('Insufficient permissions');
  }
  return user;
}
