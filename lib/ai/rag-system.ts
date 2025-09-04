import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { vectorSearchService } from './vector-search';
import { generateEmbedding } from './embeddings';

interface DocumentMetadata {
  title: string;
  documentType: 'pdf' | 'docx' | 'txt';
  uploadedAt: Date;
  [key: string]: unknown;
}

interface Chunk {
  id: string;
  documentId: string;
  companyId: string;
  content: string;
  embedding?: number[];
  metadata: DocumentMetadata & { section: string };
}

export interface SearchResult {
  chunk: Chunk;
  score: number;
}

class RAGSystem {
  async processDocument(
    documentId: string,
    companyId: string,
    content: string,
    metadata: DocumentMetadata,
  ): Promise<void> {
    try {
      const chunks = this.splitIntoChunks(content);
      const chunksToUpsert: { id: string; embedding: number[] }[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        const chunkId = `${documentId}_chunk_${i}`;

        const embedding = await generateEmbedding(chunkContent);

        const chunkData = {
          id: chunkId,
          documentId,
          companyId,
          content: chunkContent,
          metadata: { ...metadata, section: `Part ${i + 1}` },
          createdAt: FieldValue.serverTimestamp(),
        } as Chunk & { createdAt: unknown };
        await adminDb.collection('document_chunks').doc(chunkId).set(chunkData);

        if (embedding.length > 0) {
          chunksToUpsert.push({ id: chunkId, embedding });
        }
      }

      if (chunksToUpsert.length > 0) {
        await vectorSearchService.upsertChunks(chunksToUpsert);
      }

      await adminDb.collection('documents').doc(documentId).update({
        ragProcessed: true,
        chunkCount: chunks.length,
        processedAt: FieldValue.serverTimestamp(),
      });

      console.log(
        `✅ Processed and indexed ${chunks.length} chunks for document ${documentId}`,
      );
    } catch (error) {
      console.error('Error processing document for RAG:', error);
      throw error;
    }
  }

  async search(
    query: string,
    companyId: string,
    limit = 5,
  ): Promise<SearchResult[]> {
    try {
      const queryEmbedding = await generateEmbedding(query);
      const vectorResults = await this.vectorSearch(
        queryEmbedding,
        companyId,
        limit,
      );

      if (vectorResults.length >= limit) {
        return vectorResults;
      }

      const keywordResults = await this.keywordSearch(query, companyId, limit);
      const seen = new Set(vectorResults.map((r) => r.chunk.id));
      const merged = [
        ...vectorResults,
        ...keywordResults.filter((r) => !seen.has(r.chunk.id)),
      ];

      return merged.slice(0, limit);
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  private async vectorSearch(
    queryEmbedding: number[],
    companyId: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const neighbors = await vectorSearchService.findNearestNeighbors(
      queryEmbedding,
      limit,
    );
    if (!neighbors || neighbors.length === 0) {
      return [];
    }

    const chunkIds = neighbors.map((n) => n.datapoint.datapointId);
    const chunkDocs = await adminDb
      .collection('document_chunks')
      .where('id', 'in', chunkIds)
      .get();

    const chunksById = new Map<string, Chunk>();
    chunkDocs.forEach((doc) => chunksById.set(doc.id, doc.data() as Chunk));

    return neighbors
      .map((neighbor) => {
        const chunk = chunksById.get(neighbor.datapoint.datapointId);
        return {
          chunk,
          score: 1 / (1 + neighbor.distance),
        } as SearchResult;
      })
      .filter((result) => result.chunk && result.chunk.companyId === companyId);
  }

  private async keywordSearch(
    query: string,
    companyId: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const keywords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((k) => k.length > 2);
    if (keywords.length === 0) return [];

    const snapshot = await adminDb
      .collection('document_chunks')
      .where('companyId', '==', companyId)
      .limit(limit * 3)
      .get();

    const results: SearchResult[] = [];
    snapshot.docs.forEach((doc) => {
      const chunk = doc.data() as Chunk;
      const content = chunk.content.toLowerCase();
      let score = 0;
      for (const keyword of keywords) {
        const matches = content.match(new RegExp(keyword, 'g'));
        if (matches) score += matches.length;
      }
      if (score > 0) {
        results.push({ chunk, score });
      }
    });

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  splitIntoChunks(content: string, chunkSize = 1000): string[] {
    const chunks: string[] = [];
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];

    let currentChunk = '';
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += ` ${sentence}`;
      }
    }
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    return chunks;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (normA * normB);
  }

  generateContext(results: SearchResult[]): string {
    if (results.length === 0) {
      return 'No relevant documents found.';
    }

    const context = results
      .map((result, index) => {
        const { chunk } = result;
        return `
[Document ${index + 1}]
Title: ${chunk.metadata.title}
Section: ${chunk.metadata.section || 'General'}
Content: ${chunk.content}
---`;
      })
      .join('\n');

    return `Based on the following relevant documents:\n\n${context}`;
  }
}

export const ragSystem = new RAGSystem();
