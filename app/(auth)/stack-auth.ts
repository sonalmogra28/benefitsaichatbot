import { stackServerApp } from '@/stack';
import { db } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { setTenantContext } from '@/lib/db/tenant-utils';

export type UserType =
  | 'employee'
  | 'hr_admin'
  | 'company_admin'
  | 'platform_admin'
  | 'guest';

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

    // First, look up user in our database by Stack user ID without tenant context
    // Use Neon Auth sync table
    const neonUsers = await db.execute(sql`
      SELECT id, name, email, created_at, raw_json
      FROM neon_auth.users_sync
      WHERE id = ${stackUser.id}
      LIMIT 1
    `);

    if (!neonUsers || neonUsers.length === 0) {
      // User should exist in Neon Auth if they're signed in
      // Return basic info while Neon Auth syncs
      return {
        user: {
          id: stackUser.id,
          email: stackUser.primaryEmail || '',
          name: stackUser.displayName || undefined,
          type: 'employee' as UserType,
          stackUserId: stackUser.id,
        },
      };
    }

    const neonUser = neonUsers[0];
    
    // Extract metadata from raw_json
    const rawJson = neonUser.raw_json as any;
    const metadata = rawJson?.clientMetadata || {};
    const userType = metadata.userType || 'employee';
    const companyId = metadata.companyId || null;

    // Set tenant context if user has a company
    if (companyId) {
      await setTenantContext(stackUser.id, companyId);
    }

    return {
      user: {
        id: neonUser.id as string,
        email: neonUser.email as string,
        name: (neonUser.name || neonUser.email) as string,
        type: userType as UserType,
        companyId: companyId,
        stackUserId: neonUser.id as string,
      },
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
  throw new Error(
    'Sign out must be done client-side. Use the SignOutForm component.',
  );
}

/**
 * Get the current user's company
 */
export async function getUserCompany(userId: string) {
  const user = await db
    .select({
      company: companies,
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
export function hasRole(
  user: AuthUser | null,
  requiredRoles: UserType[],
): boolean {
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
export async function requireRole(
  requiredRoles: UserType[],
): Promise<AuthUser> {
  const user = await requireAuth();
  if (!hasRole(user, requiredRoles)) {
    throw new Error('Insufficient permissions');
  }
  return user;
}
