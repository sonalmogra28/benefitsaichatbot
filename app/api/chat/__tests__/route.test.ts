import { describe, it, expect, vi } from 'vitest';
import { POST } from '../route';
import { NextResponse } from 'next/server';
import { streamText } from 'ai';
import { ragSystem } from '@/lib/ai/rag-system';

const { mockCollection, mockDoc } = vi.hoisted(() => {
  return {
    mockCollection: vi.fn(),
    mockDoc: vi.fn(),
  };
});

vi.mock('@/lib/firebase/admin', () => {
  mockCollection.mockImplementation(() => ({
    doc: (id?: string) =>
      id
        ? {
            id,
            set: vi.fn().mockResolvedValue(undefined),
            collection: mockCollection,
          }
        : { id: 'newChat', collection: mockCollection },
  }));
  mockDoc.mockImplementation(() => ({
    set: vi.fn().mockResolvedValue(undefined),
    collection: mockCollection,
  }));
  return {
    adminDb: {
      collection: mockCollection,
      doc: mockDoc,
    },
  };
});

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn(() => new Date()) },
}));

vi.mock('@/lib/ai/rag-system', () => ({
  ragSystem: {
    search: vi
      .fn()
      .mockResolvedValue([
        { chunk: { id: 'c1', documentId: 'd1', content: 'ctx' }, score: 0.5 },
      ]),
  },
}));

vi.mock('ai', () => ({
  streamText: vi.fn(async ({ onFinish }) => {
    if (onFinish) {
      await onFinish({
        text: 'response',
        toolCalls: null,
        toolResults: null,
        usage: {},
        finishReason: 'stop',
      });
    }
    return { toDataStreamResponse: () => new NextResponse('ok') };
  }),
}));

describe('chat route POST', () => {
  it('returns 401 when headers missing', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ messages: [] }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });

  it('returns streamed response when headers present', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: {
        'x-user-id': 'u1',
        'x-company-id': 'c1',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ id: 'm1', role: 'user', content: 'hi' }],
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
  });

  it('returns response without context when RAG empty', async () => {
    (ragSystem.search as any).mockResolvedValueOnce([]);
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: {
        'x-user-id': 'u1',
        'x-company-id': 'c1',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ id: 'm1', role: 'user', content: 'hi' }],
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
  });

  it('returns 500 on internal error', async () => {
    (streamText as any).mockRejectedValueOnce(new Error('fail'));
    const req = new Request('http://localhost', {
      method: 'POST',
      headers: {
        'x-user-id': 'u1',
        'x-company-id': 'c1',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ id: 'm1', role: 'user', content: 'hi' }],
      }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });
});
