import { jwtVerify, createRemoteJWKSet } from 'jose';
import { getAdB2CConfig } from './config';
import { logger } from '@/lib/logger';
import { USER_ROLES } from '@/lib/constants/roles';

const adB2CConfig = getAdB2CConfig();
const JWKS_URL = `https://${adB2CConfig.tenantName}.b2clogin.com/${adB2CConfig.tenantName}.onmicrosoft.com/${adB2CConfig.signupSigninPolicy}/discovery/v2.0/keys`;

const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

export function getToken(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme === 'Bearer' && token) {
    return token;
  }
  return null;
}

export async function validateToken(token: string): Promise<{
  valid: boolean;
  user?: {
    id: string;
    email: string;
    name: string;
    roles: string[];
    companyId: string;
    permissions: string[];
  };
  error?: string;
} | null> {
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${adB2CConfig.tenantName}.b2clogin.com/${adB2CConfig.tenantName}.onmicrosoft.com/v2.0/`,
      audience: adB2CConfig.clientId,
      algorithms: ['RS256'],
    });

    // Extract user information from JWT claims
    const userId = payload.sub || payload.oid || '';
    const email = payload.email || payload.preferred_username || '';
    const name = payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim() || email;
    
    // Extract roles from custom claims or groups
    const roles = extractRolesFromClaims(payload);
    const companyId = extractCompanyIdFromClaims(payload);
    
    // Get permissions based on roles
    const permissions = getPermissionsForRoles(roles);

    logger.info('Token validated successfully', {
      userId,
      email,
      roles,
      companyId
    });

    return {
      valid: true,
      user: {
        id: userId,
        email,
        name,
        roles,
        companyId,
        permissions
      }
    };
  } catch (error) {
    logger.error('Token validation error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Token validation failed'
    };
  }
}

function extractRolesFromClaims(payload: any): string[] {
  const roles: string[] = [];
  
  // Check for custom role claims
  if (payload.roles && Array.isArray(payload.roles)) {
    roles.push(...payload.roles);
  }
  
  // Check for group claims (Azure AD B2C groups)
  if (payload.groups && Array.isArray(payload.groups)) {
    // Map group IDs to role names (this would need to be configured based on your B2C setup)
    const groupToRoleMap: Record<string, string> = {
      // Add your group ID to role mappings here
      // 'group-id-1': USER_ROLES.SUPER_ADMIN,
      // 'group-id-2': USER_ROLES.COMPANY_ADMIN,
    };
    
    payload.groups.forEach((groupId: string) => {
      const role = groupToRoleMap[groupId];
      if (role) {
        roles.push(role);
      }
    });
  }
  
  // Check for extension attributes that might contain roles
  if (payload.extension_Roles && Array.isArray(payload.extension_Roles)) {
    roles.push(...payload.extension_Roles);
  }
  
  // Default to employee role if no roles found
  if (roles.length === 0) {
    roles.push(USER_ROLES.EMPLOYEE);
  }
  
  return [...new Set(roles)]; // Remove duplicates
}

function extractCompanyIdFromClaims(payload: any): string {
  // Check for custom company ID claim
  if (payload.companyId) {
    return payload.companyId;
  }
  
  // Check for extension attribute
  if (payload.extension_CompanyId) {
    return payload.extension_CompanyId;
  }
  
  // Check for organization claim
  if (payload.org_id) {
    return payload.org_id;
  }
  
  // Default company ID (this should be configured based on your setup)
  return 'default-company-id';
}

function getPermissionsForRoles(roles: string[]): string[] {
  const permissions: string[] = [];
  
  // Role to permissions mapping (imported from unified-auth.ts)
  const ROLE_PERMISSIONS: Record<string, string[]> = {
    [USER_ROLES.SUPER_ADMIN]: [
      'manage_users',
      'manage_companies',
      'manage_benefits',
      'view_analytics',
      'manage_settings',
      'manage_employees',
      'view_company_analytics',
      'manage_company_benefits',
    ],
    [USER_ROLES.PLATFORM_ADMIN]: [
      'manage_users',
      'manage_benefits',
      'view_analytics',
      'manage_settings',
    ],
    [USER_ROLES.COMPANY_ADMIN]: [
      'manage_employees',
      'view_company_analytics',
      'manage_company_benefits',
      'view_benefits',
      'chat_with_ai',
      'view_documents',
    ],
    [USER_ROLES.HR_ADMIN]: [
      'manage_employees',
      'view_company_analytics',
      'view_benefits',
      'chat_with_ai',
      'view_documents',
    ],
    [USER_ROLES.EMPLOYEE]: [
      'view_benefits',
      'enroll_benefits',
      'chat_with_ai',
      'view_documents',
    ],
  };
  
  roles.forEach(role => {
    const rolePermissions = ROLE_PERMISSIONS[role] || [];
    permissions.push(...rolePermissions);
  });
  
  return [...new Set(permissions)]; // Remove duplicates
}
