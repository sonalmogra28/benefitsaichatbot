import { describe, it, expect, vi, beforeEach } from 'vitest';

const chunkStore = new Map<string, any>();
let currentId = '';
const chunkSetMock = vi.fn(async (data: any) => {
  chunkStore.set(currentId, data);
});
const documentUpdateMock = vi.fn();

vi.mock('@/lib/firebase/admin', () => ({
  adminDb: {
    collection: vi.fn((name: string) => {
      if (name === 'document_chunks') {
        return {
          doc: vi.fn((id: string) => {
            currentId = id;
            return { set: chunkSetMock };
          }),
          where: vi.fn((field: string, op: string, ids: string[]) => ({
            get: vi.fn(async () => ({
              forEach: (cb: any) => {
                ids.forEach((id) => {
                  const data = chunkStore.get(id);
                  if (data) cb({ id, data: () => data });
                });
              },
            })),
          })),
        };
      }
      if (name === 'documents') {
        return {
          doc: vi.fn(() => ({ update: documentUpdateMock })),
        };
      }
      return { doc: vi.fn() };
    }),
  },
  FieldValue: { serverTimestamp: vi.fn(() => 'timestamp') },
}));

vi.mock('@/lib/ai/embeddings', () => ({
  generateEmbedding: vi.fn(),
}));

vi.mock('@/lib/ai/vector-search', () => ({
  vectorSearchService: {
    upsertChunks: vi.fn(),
    findNearestNeighbors: vi.fn(),
  },
}));

import { ragSystem } from '@/lib/ai/rag-system';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { vectorSearchService } from '@/lib/ai/vector-search';

beforeEach(() => {
  chunkStore.clear();
  currentId = '';
  vi.clearAllMocks();
});

describe.skip('RAGSystem chunking', () => {
  it('splits text into chunks below the limit', () => {
    const text = 'Sentence one. Sentence two is a bit longer. Sentence three.';
    const chunks = (ragSystem as any).splitIntoChunks(text, 25);
    expect(chunks).toEqual([
      'Sentence one',
      'Sentence two is a bit longer',
      'Sentence three.',
    ]);
  });
});

describe.skip('RAGSystem embedding error paths', () => {
  it('throws when embedding generation fails during processing', async () => {
    (generateEmbedding as any).mockRejectedValue(new Error('fail'));
    await expect(
      ragSystem.processDocument('doc1', 'comp1', 'text', { title: 't' }),
    ).rejects.toThrow('fail');
    expect(vectorSearchService.upsertChunks).not.toHaveBeenCalled();
    expect(documentUpdateMock).not.toHaveBeenCalled();
    expect(chunkSetMock).not.toHaveBeenCalled();
  });

  it('returns empty results when search embedding fails', async () => {
    (generateEmbedding as any).mockRejectedValue(new Error('embed error'));
    const results = await ragSystem.search('query', 'comp1');
    expect(results).toEqual([]);
    expect(vectorSearchService.findNearestNeighbors).not.toHaveBeenCalled();
  });
});

describe.skip('RAGSystem search', () => {
  it('filters search results by company', async () => {
    (generateEmbedding as any).mockResolvedValue([0.1, 0.2]);
    vectorSearchService.findNearestNeighbors.mockResolvedValue([
      { datapoint: { datapointId: 'chunk1' }, distance: 0.1 },
      { datapoint: { datapointId: 'chunk2' }, distance: 0.2 },
    ]);
    chunkStore.set('chunk1', { id: 'chunk1', content: 'a', companyId: 'comp1' });
    chunkStore.set('chunk2', { id: 'chunk2', content: 'b', companyId: 'comp2' });

    const results = await ragSystem.search('query', 'comp1');
    expect(results).toEqual([
      { chunk: { id: 'chunk1', content: 'a', companyId: 'comp1' }, score: 0.1 },
    ]);
  });
});

describe.skip('RAGSystem processDocument', () => {
  it('upserts embeddings and updates document on success', async () => {
    (generateEmbedding as any).mockResolvedValue([0.1, 0.2]);
    await ragSystem.processDocument(
      'docA',
      'compA',
      'First part. Second part.',
      { title: 't' },
    );
    expect(chunkSetMock).toHaveBeenCalledTimes(1);
    expect(vectorSearchService.upsertChunks).toHaveBeenCalledWith([
      { id: 'docA_chunk_0', embedding: [0.1, 0.2] },
    ]);
    expect(documentUpdateMock).toHaveBeenCalledWith({
      ragProcessed: true,
      chunkCount: 1,
      processedAt: expect.anything(),
    });
  });
});
