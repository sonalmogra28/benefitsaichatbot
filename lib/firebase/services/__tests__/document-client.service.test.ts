import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/firebase/client', () => ({
  auth: {
    currentUser: { getIdToken: vi.fn() },
  },
}));

import { auth } from '@/lib/firebase/client';
import { DocumentClientService } from '../document-client.service';

const getIdToken = vi.mocked(auth.currentUser.getIdToken);

describe('DocumentClientService', () => {
  beforeEach(() => {
    getIdToken.mockResolvedValue('token');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists documents', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ documents: [{ id: '1' }] }),
      }),
    );
    const service = new DocumentClientService();
    const docs = await service.listDocuments();
    expect(docs).toEqual([{ id: '1' }]);
  });

  it('returns empty list on fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false } as any));
    const service = new DocumentClientService();
    const docs = await service.listDocuments();
    expect(docs).toEqual([]);
  });

  it('handles fetch throwing error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const service = new DocumentClientService();
    const docs = await service.listDocuments();
    expect(docs).toEqual([]);
  });

  it('creates document', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ id: 'doc1' }) }),
    );
    const service = new DocumentClientService();
    const id = await service.createDocument({ name: 'Doc' });
    expect(id).toBe('doc1');
  });

  it('throws on create error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false } as any));
    const service = new DocumentClientService();
    await expect(service.createDocument({})).rejects.toThrow(
      'Failed to create document',
    );
  });

  it('propagates fetch exceptions on create', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
    const service = new DocumentClientService();
    await expect(service.createDocument({})).rejects.toThrow('network');
  });
});
