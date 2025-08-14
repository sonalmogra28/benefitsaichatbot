import { stackServerApp } from '@/stack';
import { db } from '@/lib/db';
import { users, companies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { setTenantContext } from '@/lib/db/tenant-utils';
import type { StackAuthUser, AuthenticatedUser, SessionUser, UserRole } from '@/lib/db/types';

export type UserType = UserRole | 'guest';

export interface AuthUser extends AuthenticatedUser {}

export interface AuthSession extends SessionUser {}

export async function auth(): Promise<AuthSession | null> {
  try {
    const stackUser = await stackServerApp.getUser() as StackAuthUser | null;
    if (!stackUser) {
      return { user: null };
    }
    const dbUser = await getUserFromDb(stackUser.id);
    if (!dbUser) {
      return { user: null };
    }
    return { user: dbUser };
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

export async function getUserFromDb(stackUserId: string): Promise<AuthUser | null> {
  const dbUsers = await db
    .select()
    .from(users)
    .where(eq(users.stackUserId, stackUserId))
    .limit(1);

  if (dbUsers.length === 0) {
    return null;
  }
  
  const dbUser = dbUsers[0];
  
  if (dbUser.companyId) {
    await setTenantContext(dbUser.stackUserId, dbUser.companyId);
  }
  
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.firstName ? `${dbUser.firstName} ${dbUser.lastName || ''}`.trim() : dbUser.email,
    type: (dbUser.role || 'employee') as UserRole,
    companyId: dbUser.companyId || undefined,
    stackUserId: dbUser.stackUserId,
    permissions: getPermissionsForRole(dbUser.role as UserRole),
  };
}

export async function createUserFromStackAuth(stackUser: StackAuthUser): Promise<AuthUser> {
  const metadata = stackUser.clientMetadata || {};
  const userType = (metadata.userType as UserRole) || 'employee';
  const companyId = metadata.companyId;
  
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

export async function signOut() {
  throw new Error(
    'Sign out must be done client-side. Use the SignOutForm component.',
  );
}

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

export function hasRole(
  user: AuthUser | null,
  requiredRoles: UserType[],
): boolean {
  if (!user) return false;
  if (user.type === 'platform_admin') return true;
  if (user.type === 'company_admin' && requiredRoles.includes('hr_admin')) {
    return true;
  }
  return requiredRoles.includes(user.type);
}

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
      '*',
    ],
  };
  return permissions[role] || [];
}

export function hasPermission(
  user: AuthUser | null,
  permission: string,
): boolean {
  if (!user) return false;
  if (user.type === 'platform_admin') return true;
  return user.permissions?.includes(permission) || false;
}

export async function requireAuth(): Promise<AuthUser> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Authentication required');
  }
  return session.user;
}

export async function requireRole(
  requiredRoles: UserType[],
): Promise<AuthUser> {
  const user = await requireAuth();
  if (!hasRole(user, requiredRoles)) {
    throw new Error('Insufficient permissions');
  }
  return user;
}

export async function requirePermission(
  permission: string,
): Promise<AuthUser> {
  const user = await requireAuth();
  if (!hasPermission(user, permission)) {
    throw new Error(`Missing required permission: ${permission}`);
  }
  return user;
}
