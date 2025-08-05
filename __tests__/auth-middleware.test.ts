import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withPlatformAdmin, withCompanyAdmin } from '@/lib/auth/api-middleware';
import { auth } from '@/app/(auth)/stack-auth';

// Mock the auth module
vi.mock('@/app/(auth)/stack-auth', () => ({
  auth: vi.fn(),
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
      
      vi.mocked(auth).mockResolvedValue({ user: mockUser });
      
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
      vi.mocked(auth).mockResolvedValue({ user: null });
      
      const handler = withAuth(async () => {
        return NextResponse.json({ should: 'not reach here' });
      });
      
      const response = await handler(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Authentication required' });
    });

    it('should handle auth errors', async () => {
      vi.mocked(auth).mockRejectedValue(new Error('Auth service error'));
      
      const handler = withAuth(async () => {
        return NextResponse.json({ should: 'not reach here' });
      });
      
      const response = await handler(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(500);
      expect(data).toEqual({ error: 'Internal server error' });
    });
  });

  describe('withPlatformAdmin', () => {
    it('should allow platform admin access', async () => {
      const mockAdmin = {
        id: 'admin-id',
        email: 'admin@example.com',
        type: 'platform_admin' as const,
        stackUserId: 'admin-id',
      };
      
      vi.mocked(auth).mockResolvedValue({ user: mockAdmin });
      
      const handler = withPlatformAdmin(async (req, session) => {
        expect(session.user.type).toBe('platform_admin');
        return NextResponse.json({ success: true });
      });
      
      const response = await handler(mockRequest);
      expect(response.status).toBe(200);
    });

    it('should reject non-platform-admin users', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        type: 'employee' as const,
        stackUserId: 'user-id',
      };
      
      vi.mocked(auth).mockResolvedValue({ user: mockUser });
      
      const handler = withPlatformAdmin(async () => {
        return NextResponse.json({ should: 'not reach here' });
      });
      
      const response = await handler(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(403);
      expect(data).toEqual({ error: 'Platform admin access required' });
    });
  });

  describe('withCompanyAdmin', () => {
    it('should allow company admin access', async () => {
      const mockAdmin = {
        id: 'admin-id',
        email: 'admin@example.com',
        type: 'company_admin' as const,
        companyId: 'company-123',
        stackUserId: 'admin-id',
      };
      
      vi.mocked(auth).mockResolvedValue({ user: mockAdmin });
      
      const handler = withCompanyAdmin(async (req, session) => {
        expect(session.user.type).toBe('company_admin');
        return NextResponse.json({ success: true });
      });
      
      const response = await handler(mockRequest);
      expect(response.status).toBe(200);
    });

    it('should allow HR admin access', async () => {
      const mockHrAdmin = {
        id: 'hr-id',
        email: 'hr@example.com',
        type: 'hr_admin' as const,
        companyId: 'company-123',
        stackUserId: 'hr-id',
      };
      
      vi.mocked(auth).mockResolvedValue({ user: mockHrAdmin });
      
      const handler = withCompanyAdmin(async (req, session) => {
        expect(session.user.type).toBe('hr_admin');
        return NextResponse.json({ success: true });
      });
      
      const response = await handler(mockRequest);
      expect(response.status).toBe(200);
    });

    it('should allow platform admin access', async () => {
      const mockPlatformAdmin = {
        id: 'platform-id',
        email: 'platform@example.com',
        type: 'platform_admin' as const,
        stackUserId: 'platform-id',
      };
      
      vi.mocked(auth).mockResolvedValue({ user: mockPlatformAdmin });
      
      const handler = withCompanyAdmin(async (req, session) => {
        expect(session.user.type).toBe('platform_admin');
        return NextResponse.json({ success: true });
      });
      
      const response = await handler(mockRequest);
      expect(response.status).toBe(200);
    });

    it('should reject regular employees', async () => {
      const mockEmployee = {
        id: 'emp-id',
        email: 'employee@example.com',
        type: 'employee' as const,
        companyId: 'company-123',
        stackUserId: 'emp-id',
      };
      
      vi.mocked(auth).mockResolvedValue({ user: mockEmployee });
      
      const handler = withCompanyAdmin(async () => {
        return NextResponse.json({ should: 'not reach here' });
      });
      
      const response = await handler(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(403);
      expect(data).toEqual({ error: 'Admin access required' });
    });

    it('should reject users without company', async () => {
      const mockAdmin = {
        id: 'admin-id',
        email: 'admin@example.com',
        type: 'company_admin' as const,
        companyId: undefined,
        stackUserId: 'admin-id',
      };
      
      vi.mocked(auth).mockResolvedValue({ user: mockAdmin });
      
      const handler = withCompanyAdmin(async () => {
        return NextResponse.json({ should: 'not reach here' });
      });
      
      const response = await handler(mockRequest);
      const data = await response.json();
      
      expect(response.status).toBe(403);
      expect(data).toEqual({ error: 'Company association required' });
    });
  });
});