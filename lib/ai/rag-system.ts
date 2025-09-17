import { getContainer, DOCUMENTS_CONTAINER } from '@/lib/azure/cosmos-db';
import { vectorSearchService } from './vector-search';
import { generateEmbedding } from './embeddings';

interface DocumentMetadata {
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
      const chunksToUpsert: { id: string; embedding: number[]; companyId: string }[] = [];
      const documentsContainer = await getContainer(DOCUMENTS_CONTAINER);

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
          createdAt: new Date().toISOString(),
        };
        await documentsContainer.items.create(chunkData);

        if (embedding.length > 0) {
          chunksToUpsert.push({ id: chunkId, embedding, companyId });
        }
      }

      if (chunksToUpsert.length > 0) {
        await vectorSearchService.upsertChunks(chunksToUpsert);
      }

      const { resource: doc } = await documentsContainer.item(documentId, companyId).read();
      if (doc) {
        await documentsContainer.item(documentId, companyId).replace({
          ...doc,
          ragProcessed: true,
          chunkCount: chunks.length,
          processedAt: new Date().toISOString(),
        });
      }

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
      const seen = new Set(vectorResults.map((r: SearchResult) => r.chunk.id));
      const merged = [
        ...vectorResults,
        ...keywordResults.filter((r: SearchResult) => !seen.has(r.chunk.id)),
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
    const results = await vectorSearchService.findNearestNeighbors(
      queryEmbedding,
      companyId,
      limit,
    );

    if (!results || results.length === 0) {
      return [];
    }
    // Results now come directly from Azure AI Search with all needed fields
    return results.map((result) => ({
      chunk: result.chunk as Chunk,
      score: result.score,
    }));
  }

  private async keywordSearch(
    query: string,
    companyId: string,
    limit: number
  ): Promise<SearchResult[]> {
    try {
      const documentsContainer = await getContainer(DOCUMENTS_CONTAINER);
      const querySpec = {
        query: "SELECT * FROM c WHERE c.companyId = @companyId AND CONTAINS(c.content, @query, true) OFFSET 0 LIMIT @limit",
        parameters: [
          { name: "@companyId", value: companyId },
          { name: "@query", value: query },
          { name: "@limit", value: limit }
        ]
      };
      
      const { resources: items } = await documentsContainer.items.query(querySpec).fetchAll();

      return items.map((item: any) => ({
        chunk: item,
        score: 1, // Keyword search doesn't have a nuanced score here
      }));
    } catch (error) {
      console.error('Keyword search error:', error);
      return [];
    }
  }

  private splitIntoChunks(text: string, size = 1000): string[] {
    return text.match(new RegExp(`.{1,${size}}`, 'g')) || [];
  }
}

export const ragSystem = new RAGSystem();
