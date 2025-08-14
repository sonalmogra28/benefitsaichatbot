import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authModule from '@/app/(auth)/stack-auth';
import { db } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    execute: vi.fn(),
  },
}));

vi.mock('@/stack', () => ({
  stackServerApp: {
    getUser: vi.fn(),
  },
}));

import { stackServerApp } from '@/stack';

describe('Authentication System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('auth()', () => {
    it('should return null when no Stack user is authenticated', async () => {
      vi.mocked(stackServerApp.getUser).mockResolvedValue(null);
      const result = await authModule.auth();
      expect(result).toEqual({ user: null });
    });
  });
});
