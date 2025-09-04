import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

export interface SessionUser extends DecodedIdToken {
  role?: string;
  permissions?: string[];
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session');
    const authToken = sessionCookie?.value;

    if (!authToken) {
      return null;
    }

    const decodedToken = await adminAuth.verifyIdToken(authToken);
    
    const sessionUser: SessionUser = {
      ...decodedToken,
      role: decodedToken.role || 'employee',
      permissions: decodedToken.permissions || []
    };

    return sessionUser;
  } catch (error) {
    return null;
  }
}

export async function getSessionFromHeader(request: Request): Promise<SessionUser | null> {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    const sessionUser: SessionUser = {
      ...decodedToken,
      role: decodedToken.role || 'employee',
      permissions: decodedToken.permissions || []
    };

    return sessionUser;
  } catch (error) {
    return null;
  }
}

export async function setSession(token: string, expiresIn: number = 60 * 60 * 24 * 5 * 1000) {
  const cookieStore = await cookies();
  
  cookieStore.set('__session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: expiresIn / 1000,
    path: '/'
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete('__session');
}

export function hasRole(user: SessionUser | null, requiredRole: string): boolean {
  if (!user) return false;
  
  const roleHierarchy: Record<string, number> = {
    'super-admin': 3,
    'company-admin': 2,
    'employee': 1
  };

  const userLevel = roleHierarchy[user.role || 'employee'] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
}
