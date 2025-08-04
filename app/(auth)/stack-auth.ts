import { stackServerApp } from '@/stack';
import { db } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { setTenantContext } from '@/lib/db/tenant-utils';

export type UserType = 'employee' | 'hr_admin' | 'company_admin' | 'platform_admin' | 'guest';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  type: UserType;
  companyId?: string;
  stackUserId: string;
}

export interface AuthSession {
  user: AuthUser | null;
  expires?: string;
}

/**
 * Get the current authenticated user from Stack Auth
 */
export async function auth(): Promise<AuthSession | null> {
  try {
    const stackUser = await stackServerApp.getUser();
    
    if (!stackUser) {
      return { user: null };
    }

    // Set tenant context for secure queries
    await setTenantContext(stackUser.id);

    // Look up user in our database by Stack user ID
    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.stackUserId, stackUser.id))
      .limit(1);

    if (dbUsers.length === 0) {
      // User exists in Stack but not in our DB - create them
      // This would typically happen during onboarding
      return {
        user: {
          id: stackUser.id,
          email: stackUser.primaryEmail || '',
          name: stackUser.displayName || undefined,
          type: 'employee', // Default type
          stackUserId: stackUser.id,
        }
      };
    }

    const [dbUser] = dbUsers;

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: `${dbUser.firstName || ''} ${dbUser.lastName || ''}`.trim() || undefined,
        type: (dbUser.role as UserType) || 'employee',
        companyId: dbUser.companyId,
        stackUserId: dbUser.stackUserId,
      }
    };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

/**
 * Sign out the current user
 * Note: Sign out must be done client-side with Stack Auth
 */
export async function signOut() {
  // Stack Auth signOut is only available client-side
  // Use the SignOutForm component for signing out
  throw new Error('Sign out must be done client-side. Use the SignOutForm component.');
}

/**
 * Get the current user's company
 */
export async function getUserCompany(userId: string) {
  const user = await db
    .select({
      company: companies
    })
    .from(users)
    .innerJoin(companies, eq(users.companyId, companies.id))
    .where(eq(users.id, userId))
    .limit(1);

  return user[0]?.company || null;
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthUser | null, requiredRoles: UserType[]): boolean {
  if (!user) return false;
  return requiredRoles.includes(user.type);
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Authentication required');
  }
  return session.user;
}

/**
 * Require specific role - throws if not authorized
 */
export async function requireRole(requiredRoles: UserType[]): Promise<AuthUser> {
  const user = await requireAuth();
  if (!hasRole(user, requiredRoles)) {
    throw new Error('Insufficient permissions');
  }
  return user;
}