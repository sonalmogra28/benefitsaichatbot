import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auth, requireAuth, requireRole, hasRole } from '@/app/(auth)/stack-auth';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

// Mock the database and Stack Auth
vi.mock('@/lib/db', () => ({
  db: {
    execute: vi.fn(),
  },
}));

vi.mock('@/stack', () => ({
  stackServerApp: {
    getUser: vi.fn(),
  },
}));

// Import after mocks
import { stackServerApp } from '@/stack';

describe('Authentication System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('auth()', () => {
    it('should return null when no Stack user is authenticated', async () => {
      vi.mocked(stackServerApp.getUser).mockResolvedValue(null);
      
      const result = await auth();
      
      expect(result).toEqual({ user: null });
    });

    it('should return user data from Neon Auth sync table', async () => {
      const mockStackUser = {
        id: 'test-user-id',
        primaryEmail: 'test@example.com',
        displayName: 'Test User',
      };
      
      const mockNeonUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        created_at: new Date(),
        raw_json: {
          clientMetadata: {
            userType: 'employee',
            companyId: 'test-company-id',
          },
        },
      };
      
      vi.mocked(stackServerApp.getUser).mockResolvedValue(mockStackUser);
      vi.mocked(db.execute).mockResolvedValue([mockNeonUser]);
      
      const result = await auth();
      
      expect(result).toEqual({
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          type: 'employee',
          companyId: 'test-company-id',
          stackUserId: 'test-user-id',
        },
      });
      
      // Verify it queried the correct table
      expect(db.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          strings: expect.arrayContaining([
            expect.stringContaining('neon_auth.users_sync'),
          ]),
        })
      );
    });

    it('should return basic info when user not yet synced to Neon', async () => {
      const mockStackUser = {
        id: 'new-user-id',
        primaryEmail: 'new@example.com',
        displayName: 'New User',
      };
      
      vi.mocked(stackServerApp.getUser).mockResolvedValue(mockStackUser);
      vi.mocked(db.execute).mockResolvedValue([]);
      
      const result = await auth();
      
      expect(result).toEqual({
        user: {
          id: 'new-user-id',
          email: 'new@example.com',
          name: 'New User',
          type: 'employee',
          stackUserId: 'new-user-id',
        },
      });
    });

    it('should handle missing metadata gracefully', async () => {
      const mockStackUser = {
        id: 'test-user-id',
        primaryEmail: 'test@example.com',
      };
      
      const mockNeonUser = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: null,
        created_at: new Date(),
        raw_json: {},
      };
      
      vi.mocked(stackServerApp.getUser).mockResolvedValue(mockStackUser);
      vi.mocked(db.execute).mockResolvedValue([mockNeonUser]);
      
      const result = await auth();
      
      expect(result?.user?.type).toBe('employee');
      expect(result?.user?.companyId).toBeNull();
      expect(result?.user?.name).toBe('test@example.com');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(stackServerApp.getUser).mockRejectedValue(new Error('Auth error'));
      
      const result = await auth();
      
      expect(result).toBeNull();
    });
  });

  describe('hasRole()', () => {
    it('should return true when user has required role', () => {
      const user = {
        id: 'test-id',
        email: 'test@example.com',
        type: 'hr_admin' as const,
        stackUserId: 'test-id',
      };
      
      expect(hasRole(user, ['hr_admin', 'company_admin'])).toBe(true);
    });

    it('should return false when user lacks required role', () => {
      const user = {
        id: 'test-id',
        email: 'test@example.com',
        type: 'employee' as const,
        stackUserId: 'test-id',
      };
      
      expect(hasRole(user, ['hr_admin', 'company_admin'])).toBe(false);
    });

    it('should return false when user is null', () => {
      expect(hasRole(null, ['employee'])).toBe(false);
    });
  });

  describe('requireAuth()', () => {
    it('should return user when authenticated', async () => {
      const mockUser = {
        id: 'test-id',
        email: 'test@example.com',
        type: 'employee' as const,
        stackUserId: 'test-id',
      };
      
      vi.mocked(stackServerApp.getUser).mockResolvedValue({
        id: 'test-id',
        primaryEmail: 'test@example.com',
      });
      vi.mocked(db.execute).mockResolvedValue([{
        id: 'test-id',
        email: 'test@example.com',
        name: 'Test User',
        created_at: new Date(),
        raw_json: { clientMetadata: { userType: 'employee' } },
      }]);
      
      const result = await requireAuth();
      
      expect(result.email).toBe('test@example.com');
    });

    it('should throw when not authenticated', async () => {
      vi.mocked(stackServerApp.getUser).mockResolvedValue(null);
      
      await expect(requireAuth()).rejects.toThrow('Authentication required');
    });
  });

  describe('requireRole()', () => {
    it('should return user when has required role', async () => {
      vi.mocked(stackServerApp.getUser).mockResolvedValue({
        id: 'admin-id',
        primaryEmail: 'admin@example.com',
      });
      vi.mocked(db.execute).mockResolvedValue([{
        id: 'admin-id',
        email: 'admin@example.com',
        name: 'Admin User',
        created_at: new Date(),
        raw_json: { clientMetadata: { userType: 'hr_admin' } },
      }]);
      
      const result = await requireRole(['hr_admin', 'company_admin']);
      
      expect(result.type).toBe('hr_admin');
    });

    it('should throw when lacks required role', async () => {
      vi.mocked(stackServerApp.getUser).mockResolvedValue({
        id: 'user-id',
        primaryEmail: 'user@example.com',
      });
      vi.mocked(db.execute).mockResolvedValue([{
        id: 'user-id',
        email: 'user@example.com',
        name: 'Regular User',
        created_at: new Date(),
        raw_json: { clientMetadata: { userType: 'employee' } },
      }]);
      
      await expect(requireRole(['hr_admin'])).rejects.toThrow('Insufficient permissions');
    });
  });
});