import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/lib/config/env';
import type { AuthenticatedUser } from '@/lib/db/types';

const secret = new TextEncoder().encode(
  env.STACK_SECRET_SERVER_KEY || 'fallback-secret-key-min-32-characters'
);

export interface SessionData extends AuthenticatedUser {
  sessionId: string;
  expiresAt: number;
  createdAt: number;
}

/**
 * Create a secure session token
 */
export async function createSession(user: AuthenticatedUser): Promise<string> {
  const now = Date.now();
  const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours
  
  const sessionData: SessionData = {
    ...user,
    sessionId: crypto.randomUUID(),
    createdAt: now,
    expiresAt,
  };
  
  const token = await new SignJWT(sessionData as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret);
    
  return token;
}

/**
 * Verify and decode a session token
 */
export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    const sessionData = payload as unknown as SessionData;
    
    // Check if session is expired
    if (sessionData.expiresAt < Date.now()) {
      return null;
    }
    
    return sessionData;
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}

/**
 * Get the current session from cookies
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  
  if (!token) return null;
  
  return verifySession(token);
}

/**
 * Set session cookie with secure options
 */
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60, // 24 hours in seconds
    path: '/',
  });
}

/**
 * Clear the session cookie
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}

/**
 * Refresh session if needed (extends expiration)
 */
export async function refreshSession(user: AuthenticatedUser): Promise<string | null> {
  const session = await getSession();
  
  if (!session) return null;
  
  // Refresh if session is older than 12 hours
  const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);
  
  if (session.createdAt < twelveHoursAgo) {
    const newToken = await createSession(user);
    await setSessionCookie(newToken);
    return newToken;
  }
  
  return null;
}

/**
 * Validate session for admin operations
 */
export async function validateAdminSession(): Promise<SessionData | null> {
  const session = await getSession();
  
  if (!session) return null;
  
  // Admin sessions require fresher authentication (2 hours)
  const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
  
  if (session.createdAt < twoHoursAgo) {
    console.warn('Admin session too old, re-authentication required');
    return null;
  }
  
  // Check if user has admin role
  const adminRoles = ['hr_admin', 'company_admin', 'platform_admin'];
  if (!adminRoles.includes(session.type)) {
    console.warn('User does not have admin role');
    return null;
  }
  
  return session;
}