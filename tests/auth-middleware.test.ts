import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

function createRequest(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`https://example.com${path}`, {
    headers: new Headers(headers),
  });
}

describe('API auth middleware', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('blocks requests without Authorization header', async () => {
    const req = createRequest('/api/admin/users');
    const res = await middleware(req as any);
    expect(res.status).toBe(307);
  });

  it('blocks requests with insufficient role', async () => {
    // Mock verify-token response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ uid: '1', role: 'employee' }),
    }) as any;

    const req = createRequest('/api/admin/users', {
      Authorization: 'Bearer test-token',
    });
    const res = await middleware(req as any);
    expect(res.status).toBe(307);
  });
});
