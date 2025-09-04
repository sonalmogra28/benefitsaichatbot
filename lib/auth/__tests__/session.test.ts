import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn().mockResolvedValue({
      uid: '123',
      role: 'company-admin',
      permissions: ['read'],
    }),
  },
}));

const cookieStore = vi.hoisted(() => ({
  set: vi.fn(),
  delete: vi.fn(),
  get: vi.fn(),
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue(cookieStore),
}));

import {
  getSessionFromHeader,
  hasRole,
  setSession,
  clearSession,
  getSession,
} from '../session';
import { adminAuth } from '@/lib/firebase/admin';
const verifyToken = vi.mocked(adminAuth.verifyIdToken);

describe('getSessionFromHeader', () => {
  it('returns null when authorization header missing', async () => {
    const req = new Request('http://localhost');
    const result = await getSessionFromHeader(req);
    expect(result).toBeNull();
  });

  it('returns session user when token is valid', async () => {
    const req = new Request('http://localhost', {
      headers: { authorization: 'Bearer token' },
    });
    const result = await getSessionFromHeader(req);
    expect(result).toMatchObject({
      uid: '123',
      role: 'company-admin',
      permissions: ['read'],
    });
  });

  it('returns null for malformed authorization header', async () => {
    const req = new Request('http://localhost', {
      headers: { authorization: 'Token abc' },
    });
    const result = await getSessionFromHeader(req);
    expect(result).toBeNull();
  });
});

describe('hasRole', () => {
  it('allows higher roles', () => {
    const user = { role: 'super-admin' };
    expect(hasRole(user as any, 'employee')).toBe(true);
  });

  it('denies when role is insufficient', () => {
    const user = { role: 'employee' };
    expect(hasRole(user as any, 'company-admin')).toBe(false);
  });

  it('returns false when user is null', () => {
    expect(hasRole(null, 'employee')).toBe(false);
  });

  it('handles unknown roles', () => {
    const user = { role: 'contractor' };
    expect(hasRole(user as any, 'employee')).toBe(false);
  });
});

describe('session cookies', () => {
  it('sets session cookie', async () => {
    await setSession('token', 1000);
    expect(cookieStore.set).toHaveBeenCalled();
  });

  it('clears session cookie', async () => {
    await clearSession();
    expect(cookieStore.delete).toHaveBeenCalledWith('__session');
  });
});

describe('getSession', () => {
  it('returns null when cookie missing', async () => {
    cookieStore.get.mockReturnValue(undefined);
    const session = await getSession();
    expect(session).toBeNull();
  });

  it('returns session user when cookie exists', async () => {
    cookieStore.get.mockReturnValue({ value: 'token' });
    const session = await getSession();
    expect(session).toMatchObject({ uid: '123' });
  });

  it('defaults role and permissions when claims missing', async () => {
    cookieStore.get.mockReturnValue({ value: 'token' });
    verifyToken.mockResolvedValueOnce({ uid: '123' } as any);
    const session = await getSession();
    expect(session).toMatchObject({ role: 'employee', permissions: [] });
  });

  it('returns null on token verification error', async () => {
    cookieStore.get.mockReturnValue({ value: 'bad' });
    verifyToken.mockRejectedValueOnce(new Error('invalid'));
    const session = await getSession();
    expect(session).toBeNull();
  });
});

describe('getSessionFromHeader error handling', () => {
  it('returns null when token verification fails', async () => {
    const req = new Request('http://localhost', {
      headers: { authorization: 'Bearer bad' },
    });
    verifyToken.mockRejectedValueOnce(new Error('invalid'));
    const result = await getSessionFromHeader(req);
    expect(result).toBeNull();
  });
});
