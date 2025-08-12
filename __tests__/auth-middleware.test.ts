import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withPlatformAdmin, withCompanyAdmin } from '@/lib/auth/api-middleware';
import * as authModule from '@/app/(auth)/stack-auth';

// Mock the auth module
vi.mock('@/app/(auth)/stack-auth');
vi.mock('@workos-inc/authkit-nextjs', () => ({
  getToken: vi.fn(),
}));
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    execute: vi.fn(),
  },
}));

describe('Authentication Middleware', () => {
  let mockRequest: NextRequest;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequest = new NextRequest('http://localhost:3000/api/test');
  });

  describe('withAuth', () => {
    it('should allow authenticated requests', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        type: 'employee' as const,
        stackUserId: 'user-id',
      };
      
      vi.spyOn(authModule, 'auth').mockResolvedValue({ user: mockUser });
      
      const handler = withAuth(async (req, session) => {
        expect(session.user).toEqual(mockUser);
        return NextResponse.json({ success: true });
      });
      
      const response = await handler(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
    });

    it('should reject unauthenticated requests', async () => {
      vi.spyOn(authModule, 'auth').mockResolvedValue({ user: null });
      
      const handler = withAuth(async () => {
        return NextResponse.json({ should: 'not reach here' });
      });
      
      const response = await handler(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Authentication required' });
    });
  });
});
