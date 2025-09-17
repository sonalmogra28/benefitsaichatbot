import { NextRequest } from 'next/server';
import { validateToken } from '@/lib/azure/token-validation';
import { USER_ROLES } from '@/lib/constants/roles';

export async function adminMiddleware(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }

  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await validateToken(token);
  
  if (!decodedToken) {
    return { error: 'Invalid token', status: 401 };
  }

  // Check if user has admin role
  const isAdmin = [
    USER_ROLES.SUPER_ADMIN,
    USER_ROLES.PLATFORM_ADMIN,
    USER_ROLES.COMPANY_ADMIN,
    USER_ROLES.HR_ADMIN
  ].includes(decodedToken.role);

  if (!isAdmin) {
    return { error: 'Forbidden', status: 403 };
  }

  return {
    user: decodedToken,
    userId: decodedToken.oid,
    companyId: decodedToken.companyId,
    role: decodedToken.role
  };
}

// Export wrapper functions for different admin levels
export function withAuth(requiredRole: string, handler: Function) {
  return async (request: NextRequest, context: any, user?: any) => {
    const authResult = await adminMiddleware(request);
    if ('error' in authResult) {
      return new Response(JSON.stringify({ error: authResult.error }), { 
        status: authResult.status 
      });
    }
    return handler(request, context, authResult);
  };
}

export function requireCompanyAdmin(handler: Function) {
  return withAuth(USER_ROLES.COMPANY_ADMIN, handler);
}

export function requireSuperAdmin(handler: Function) {
  return withAuth(USER_ROLES.SUPER_ADMIN, handler);
}
