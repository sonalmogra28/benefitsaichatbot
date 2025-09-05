import { describe, it, expect, vi, beforeEach } from 'vitest';

var updateMock: any;
var docGetMock: any;
var notifyMock: any;

vi.mock('@/lib/firebase/admin', () => {
  updateMock = vi.fn();
  docGetMock = vi.fn();
  return {
    adminDb: {
      collection: () => ({
        doc: () => ({ get: docGetMock, update: updateMock }),
      }),
    },
    FieldValue: { serverTimestamp: () => 'timestamp' },
  };
});

vi.mock('@/lib/ai/embeddings', () => ({
  generateEmbeddings: vi.fn(async (chunks: string[]) => chunks.map(() => [0])),
}));

vi.mock('@/lib/ai/vector-search', () => ({
  upsertDocumentChunks: vi.fn(async () => ({ status: 'success', vectorsUpserted: 1 })),
  vectorSearchService: {},
}));

vi.mock('@/lib/services/notification.service', () => {
  notifyMock = vi.fn();
  return {
    notificationService: { sendDocumentProcessedNotification: notifyMock },
  };
});

beforeEach(() => {
  (global as any).fetch = vi.fn(async () => ({
    ok: true,
    arrayBuffer: async () => new TextEncoder().encode('hello world').buffer,
  }));
  updateMock.mockReset();
  docGetMock.mockReset();
  notifyMock.mockReset();
});

import { processDocument } from '@/lib/documents/processor';
import { generateEmbeddings } from '@/lib/ai/embeddings';
import { notificationService } from '@/lib/services/notification.service';

describe('processDocument notifications', () => {
  beforeEach(() => {
    docGetMock.mockResolvedValue({
      exists: true,
      id: 'doc1',
      data: () => ({
        fileUrl: 'http://example.com/file.txt',
        fileType: 'text/plain',
        companyId: 'comp1',
        title: 'Test Document',
        createdBy: 'user1',
      }),
    });
  });

  it('sends success notification when document is processed', async () => {
    await processDocument('doc1');
    expect(notificationService.sendDocumentProcessedNotification).toHaveBeenCalledWith({
      userId: 'user1',
      documentName: 'Test Document',
      status: 'processed',
    });
  });

  it('sends failure notification when processing fails', async () => {
    (generateEmbeddings as any).mockRejectedValueOnce(new Error('embedding fail'));
    await expect(processDocument('doc1')).rejects.toThrow('embedding fail');
    expect(notificationService.sendDocumentProcessedNotification).toHaveBeenCalledWith({
      userId: 'user1',
      documentName: 'Test Document',
      status: 'failed',
      errorMessage: 'embedding fail',
    });
  });
});
