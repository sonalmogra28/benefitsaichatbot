import { describe, it, expect, vi } from 'vitest';
import { POST as simpleSessionPost } from '@/app/api/auth/simple-session/route';

vi.mock('@/lib/firebase/admin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn().mockRejectedValue(new Error('Invalid token')),
    createSessionCookie: vi.fn(),
  },
}));

describe('Auth endpoint penetration tests', () => {
  it('rejects SQL injection in idToken', async () => {
    const req = new Request('http://localhost/api/auth/simple-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: "' OR '1'='1" }),
    });
    const res = await simpleSessionPost(req as any);
    expect(res.status).not.toBe(200);
  });

  it('rejects XSS content in idToken', async () => {
    const req = new Request('http://localhost/api/auth/simple-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: '<script>alert("xss")</script>' }),
    });
    const res = await simpleSessionPost(req as any);
    expect(res.status).not.toBe(200);
  });
});
