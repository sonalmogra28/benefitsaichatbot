/**
 * Centralized role definitions for the application
 * All role checks should use these constants to ensure consistency
 */

/**
 * User roles in hierarchical order (highest to lowest privilege)
 */
export const USER_ROLES = {
  SUPER_ADMIN: 'super-admin',
  PLATFORM_ADMIN: 'platform-admin',
  COMPANY_ADMIN: 'company-admin',
  HR_ADMIN: 'hr-admin',
  EMPLOYEE: 'employee',
} as const;

/**
 * Type for user roles
 */
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/**
 * Role hierarchy levels for permission checking
 * Higher numbers indicate higher privileges
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [USER_ROLES.SUPER_ADMIN]: 4,
  [USER_ROLES.PLATFORM_ADMIN]: 3,
  [USER_ROLES.COMPANY_ADMIN]: 2,
  [USER_ROLES.HR_ADMIN]: 1,
  [USER_ROLES.EMPLOYEE]: 0,
};

/**
 * Role display names for UI
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  [USER_ROLES.SUPER_ADMIN]: 'Super Administrator',
  [USER_ROLES.PLATFORM_ADMIN]: 'Platform Administrator',
  [USER_ROLES.COMPANY_ADMIN]: 'Company Administrator',
  [USER_ROLES.HR_ADMIN]: 'HR Administrator',
  [USER_ROLES.EMPLOYEE]: 'Employee',
};

/**
 * Role descriptions for UI tooltips and help text
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [USER_ROLES.SUPER_ADMIN]:
    'Full system access, can manage all companies and users',
  [USER_ROLES.PLATFORM_ADMIN]:
    'Can manage platform settings and multiple companies',
  [USER_ROLES.COMPANY_ADMIN]: 'Can manage all aspects of their company',
  [USER_ROLES.HR_ADMIN]:
    'Can manage employees and benefits within their company',
  [USER_ROLES.EMPLOYEE]: 'Can view and manage their own benefits',
};

/**
 * Check if a user has sufficient privileges for a required role
 * @param userRole - The user's current role
 * @param requiredRole - The minimum required role
 * @returns true if user has sufficient privileges
 */
export function hasRoleAccess(
  userRole: UserRole | undefined,
  requiredRole: UserRole,
): boolean {
  if (!userRole) return false;

  const userLevel = ROLE_HIERARCHY[userRole] ?? -1;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 999;

  return userLevel >= requiredLevel;
}

/**
 * Get all roles that a user with a given role can manage
 * @param userRole - The user's current role
 * @returns Array of roles the user can manage
 */
export function getManagedRoles(userRole: UserRole): UserRole[] {
  const userLevel = ROLE_HIERARCHY[userRole];

  return Object.entries(ROLE_HIERARCHY)
    .filter(([_, level]) => level < userLevel)
    .map(([role]) => role as UserRole);
}

/**
 * Validate if a role string is a valid UserRole
 * @param role - Role string to validate
 * @returns true if valid role
 */
export function isValidRole(role: string): role is UserRole {
  return Object.values(USER_ROLES).includes(role as UserRole);
}

/**
 * Convert legacy role formats to standardized format
 * @param legacyRole - Legacy role string (e.g., 'super_admin', 'hr_admin')
 * @returns Standardized role or undefined if invalid
 */
export function normalizeLegacyRole(
  legacyRole: string | undefined,
): UserRole | undefined {
  if (!legacyRole) return undefined;

  // Map of legacy formats to standardized roles
  const legacyMappings: Record<string, UserRole> = {
    super_admin: USER_ROLES.SUPER_ADMIN,
    'super admin': USER_ROLES.SUPER_ADMIN,
    superadmin: USER_ROLES.SUPER_ADMIN,
    platform_admin: USER_ROLES.PLATFORM_ADMIN,
    'platform admin': USER_ROLES.PLATFORM_ADMIN,
    company_admin: USER_ROLES.COMPANY_ADMIN,
    'company admin': USER_ROLES.COMPANY_ADMIN,
    hr_admin: USER_ROLES.HR_ADMIN,
    'hr admin': USER_ROLES.HR_ADMIN,
    hradmin: USER_ROLES.HR_ADMIN,
    employee: USER_ROLES.EMPLOYEE,
    user: USER_ROLES.EMPLOYEE,
  };

  // Try direct match first
  if (isValidRole(legacyRole)) {
    return legacyRole;
  }

  // Try legacy mapping
  const normalizedRole = legacyRole.toLowerCase().trim();
  return legacyMappings[normalizedRole];
}
