import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { vectorSearchService } from './vector-search';
import { generateEmbedding } from './embeddings';

interface DocumentMetadata {
  [key: string]: unknown;
}

interface SearchResult {
  chunk: any;
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
      const chunksToUpsert: {
        id: string;
        embedding: number[];
        companyId: string;
      }[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        const chunkId = `${documentId}_chunk_${i}`;

        const embedding = await generateEmbedding(chunkContent);

        // Save chunk metadata to Firestore
        const chunkData = {
          id: chunkId,
          documentId,
          companyId,
          content: chunkContent,
          metadata: { ...metadata, section: `Part ${i + 1}` },
          createdAt: FieldValue.serverTimestamp(),
        };
        await adminDb.collection('document_chunks').doc(chunkId).set(chunkData);

        if (embedding.length > 0) {
          chunksToUpsert.push({ id: chunkId, embedding, companyId });
        }
      }

      // Upsert embeddings to Vertex AI Vector Search
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
      return await this.vectorSearch(queryEmbedding, companyId, limit);
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

  
    const chunkIds = neighbors.map((n: any) => n.datapoint.datapointId);
    
    // Fetch chunk content from Firestore based on IDs from vector search
    const chunkDocs = await adminDb.collection('document_chunks').where('id', 'in', chunkIds).get();
    
    const chunksById = new Map<string, any>();
    chunkDocs.forEach((doc) => chunksById.set(doc.id, doc.data()));
    
    return neighbors.map((neighbor: any) => {
      const chunk = chunksById.get(neighbor.datapoint.datapointId);
      return {
        chunk,
        score: neighbor.distance, // Vertex AI returns distance, can be converted to similarity
      };
    }).filter((result: any) => result.chunk && result.chunk.companyId === companyId);

  }

  private splitIntoChunks(text: string, size = 1000): string[] {
    return text.match(new RegExp(`.{1,${size}}`, 'g')) || [];
  }
}

export const ragSystem = new RAGSystem();
