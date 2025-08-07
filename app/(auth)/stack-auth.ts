import { stackServerApp } from '@/stack';
import { db } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { setTenantContext } from '@/lib/db/tenant-utils';
import type { StackAuthUser, AuthenticatedUser, SessionUser, UserRole } from '@/lib/db/types';

export type UserType = UserRole | 'guest';

export interface AuthUser extends AuthenticatedUser {}

export interface AuthSession extends SessionUser {}

/**
 * Get the current authenticated user from Stack Auth
 */
export async function auth(): Promise<AuthSession | null> {
  try {
    const stackUser = await stackServerApp.getUser() as StackAuthUser | null;

    if (!stackUser) {
      return { user: null };
    }

    // Get user from our database using Stack user ID
    const dbUsers = await db
      .select()
      .from(users)
      .where(eq(users.stackUserId, stackUser.id))
      .limit(1);

    if (dbUsers.length === 0) {
      // Auto-create user on first login
      const newUser = await createUserFromStackAuth(stackUser);
      return {
        user: newUser,
      };
    }

    const dbUser = dbUsers[0];
    
    // Set tenant context for RLS
    if (dbUser.companyId) {
      await setTenantContext(dbUser.stackUserId, dbUser.companyId);
    }
    
    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.firstName ? `${dbUser.firstName} ${dbUser.lastName || ''}`.trim() : dbUser.email,
        type: (dbUser.role || 'employee') as UserRole,
        companyId: dbUser.companyId || undefined,
        stackUserId: dbUser.stackUserId,
        permissions: getPermissionsForRole(dbUser.role as UserRole),
      },
    };
  } catch (error) {
    console.error('Auth error:', error);
    
    // Return null instead of throwing to prevent app crashes
    // The middleware will handle redirecting unauthenticated users
    return null;
  }
}

/**
 * Create a new user from Stack Auth data
 */
async function createUserFromStackAuth(stackUser: StackAuthUser): Promise<AuthUser> {
  // Extract metadata from Stack Auth
  const metadata = stackUser.clientMetadata || {};
  const userType = (metadata.userType as UserRole) || 'employee';
  const companyId = metadata.companyId;
  
  // Validate company exists if companyId provided
  if (companyId) {
    const companyExists = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
      
    if (companyExists.length === 0) {
      throw new Error('Invalid company assignment');
    }
  }
  
  // Create user in database
  const [newUser] = await db
    .insert(users)
    .values({
      stackUserId: stackUser.id,
      email: stackUser.primaryEmail || stackUser.signedUpWithEmail || '',
      firstName: stackUser.displayName?.split(' ')[0] || '',
      lastName: stackUser.displayName?.split(' ').slice(1).join(' ') || '',
      role: userType,
      companyId: companyId || null,
      department: metadata.department || null,
      employeeId: metadata.employeeId || null,
      isActive: true,
    })
    .returning();
    
  return {
    id: newUser.id,
    email: newUser.email,
    name: stackUser.displayName || newUser.email,
    type: userType,
    companyId: newUser.companyId || undefined,
    stackUserId: newUser.stackUserId,
    permissions: getPermissionsForRole(userType),
  };
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
  const [result] = await db
    .select({
      company: companies,
    })
    .from(users)
    .innerJoin(companies, eq(users.companyId, companies.id))
    .where(eq(users.id, userId))
    .limit(1);

  return result?.company || null;
}

/**
 * Check if user has required role
 */
export function hasRole(
  user: AuthUser | null,
  requiredRoles: UserType[],
): boolean {
  if (!user) return false;
  
  // Platform admin has access to everything
  if (user.type === 'platform_admin') return true;
  
  // Company admin has access to HR admin functions
  if (user.type === 'company_admin' && requiredRoles.includes('hr_admin')) {
    return true;
  }
  
  return requiredRoles.includes(user.type);
}

/**
 * Get permissions for a given role
 */
function getPermissionsForRole(role: UserRole): string[] {
  const permissions: Record<UserRole, string[]> = {
    employee: [
      'benefits.view',
      'benefits.enroll',
      'profile.view',
      'profile.edit',
      'chat.use',
    ],
    hr_admin: [
      'benefits.view',
      'benefits.enroll',
      'benefits.manage',
      'profile.view',
      'profile.edit',
      'chat.use',
      'employees.view',
      'employees.edit',
      'documents.upload',
      'analytics.view',
    ],
    company_admin: [
      'benefits.view',
      'benefits.enroll',
      'benefits.manage',
      'profile.view',
      'profile.edit',
      'chat.use',
      'employees.view',
      'employees.edit',
      'employees.delete',
      'documents.upload',
      'documents.delete',
      'analytics.view',
      'analytics.export',
      'company.edit',
      'billing.view',
    ],
    platform_admin: [
      '*', // All permissions
    ],
  };
  
  return permissions[role] || [];
}

/**
 * Check if user has specific permission
 */
export function hasPermission(
  user: AuthUser | null,
  permission: string,
): boolean {
  if (!user) return false;
  
  // Platform admin has all permissions
  if (user.type === 'platform_admin') return true;
  
  return user.permissions?.includes(permission) || false;
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

/**
 * Require specific permission - throws if not authorized
 */
export async function requirePermission(
  permission: string,
): Promise<AuthUser> {
  const user = await requireAuth();
  if (!hasPermission(user, permission)) {
    throw new Error(`Missing required permission: ${permission}`);
  }
  return user;
}