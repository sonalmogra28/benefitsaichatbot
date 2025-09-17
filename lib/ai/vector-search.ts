// lib/ai/vector-search.ts

import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { getContainer } from '@/lib/azure/cosmos-db';
import { generateEmbedding, generateEmbeddings } from './embeddings';
import { DefaultAzureCredential } from '@azure/identity';

const AZURE_SEARCH_ENDPOINT = process.env.AZURE_SEARCH_ENDPOINT || '';
const AZURE_SEARCH_API_KEY = process.env.AZURE_SEARCH_API_KEY || '';
const AZURE_SEARCH_INDEX_NAME = process.env.AZURE_SEARCH_INDEX_NAME || 'document-chunks';

class VectorSearchService {
  private searchClient: SearchClient;

  constructor() {
    if (!AZURE_SEARCH_ENDPOINT) {
      throw new Error('AZURE_SEARCH_ENDPOINT not configured');
    }
    if (process.env.NODE_ENV === 'production') {
      const credential = new DefaultAzureCredential();
      this.searchClient = new SearchClient(
        AZURE_SEARCH_ENDPOINT,
        AZURE_SEARCH_INDEX_NAME,
        credential,
      );
    } else {
      if (!AZURE_SEARCH_API_KEY) {
        throw new Error('AZURE_SEARCH_API_KEY not configured for development');
      }
      this.searchClient = new SearchClient(
        AZURE_SEARCH_ENDPOINT,
        AZURE_SEARCH_INDEX_NAME,
        new AzureKeyCredential(AZURE_SEARCH_API_KEY),
      );
    }
  }

  async upsertChunks(
    chunks: { id: string; embedding: number[]; companyId: string }[],
  ) {
    const docs = chunks.map((c) => ({
      id: c.id,
      embedding: c.embedding,
      companyId: c.companyId,
    }));
    await this.searchClient.mergeOrUploadDocuments(docs);
  }

  async upsertDocumentChunks(
    companyId: string,
    chunks: { id: string; text: string; metadata: { documentId: string } }[],
  ) {
    try {
      const texts = chunks.map((c) => c.text);
      const embeddings = await generateEmbeddings(texts);

      // Store chunk data with embeddings in Cosmos DB
      const documentsContainer = await getContainer('Documents');
      for (let i = 0; i < chunks.length; i += 100) {
        const slice = chunks.slice(i, i + 100);
        const chunkData = slice.map((chunk, idx) => ({
          id: chunk.id,
          companyId,
          content: chunk.text,
          metadata: chunk.metadata,
          embedding: embeddings[i + idx],
          createdAt: new Date().toISOString(),
        }));
        
        // Batch insert into Cosmos DB
        for (const chunk of chunkData) {
          await documentsContainer.items.create(chunk);
        }
      }

      const docs = chunks.map((chunk, i) => ({
        id: chunk.id,
        companyId,
        documentId: chunk.metadata.documentId,
        content: chunk.text,
        embedding: embeddings[i],
      }));
      await this.searchClient.mergeOrUploadDocuments(docs as any);
      return docs.length;
    } catch (error) {
      console.error('Error upserting document chunks to Azure AI Search:', error);
      throw new Error('Failed to upsert document chunks');
    }
  }

  async removeDatapoints(datapointIds: string[]) {
    if (!datapointIds.length) return;
    const docs = datapointIds.map((id) => ({ id }));
    await this.searchClient.deleteDocuments(docs as any);
  }

  async findNearestNeighbors(
    queryEmbedding: number[],
    companyId: string,
    numNeighbors = 5,
  ) {
    const vectorQuery = {
      kind: 'vector',
      fields: ['embedding'],
      kNearestNeighborsCount: numNeighbors,
      vector: queryEmbedding,
    } as const;

    const results = await this.searchClient.search('', {
      vectorSearchOptions: {
        queries: [vectorQuery],
      },
      filter: `companyId eq '${companyId}'`,
      select: ['id', 'companyId', 'documentId', 'content'],
      top: numNeighbors,
    });

    const items: { chunk: any; score: number }[] = [];
    for await (const res of results.results) {
      items.push({
        chunk: res.document,
        score: res.score,
      });
    }
    return items;
  }
}

export const vectorSearchService = new VectorSearchService();

export async function upsertDocumentChunks(
  companyId: string,
  chunks: {
    id: string;
    text: string;
    embedding: number[];
    metadata?: Record<string, unknown>;
  }[],
): Promise<{ status: 'success' | 'error'; vectorsUpserted: number }> {
  if (!chunks.length) {
    return { status: 'success', vectorsUpserted: 0 };
  }

  try {
    // Store chunk metadata and embeddings in Cosmos DB in batches of 100
    const documentsContainer = await getContainer('Documents');
    for (let i = 0; i < chunks.length; i += 100) {
      const slice = chunks.slice(i, i + 100);
      for (const chunk of slice) {
        await documentsContainer.items.create({
          id: chunk.id,
          companyId,
          content: chunk.text,
          metadata: chunk.metadata,
          embedding: chunk.embedding,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Upsert embeddings to Azure AI Search in batches of 100
    let upserted = 0;
    for (let i = 0; i < chunks.length; i += 100) {
      const slice = chunks.slice(i, i + 100).map((chunk) => ({
        id: chunk.id,
        embedding: chunk.embedding,
        companyId,
      }));
      if (slice.length > 0) {
        await vectorSearchService.upsertChunks(slice);
        upserted += slice.length;
      }
    }

    console.log(`Stored ${upserted} embedding vectors for company ${companyId}`);
    return { status: 'success', vectorsUpserted: upserted };
  } catch (error) {
    console.error('Error upserting document chunks:', error);
    return { status: 'error', vectorsUpserted: 0 };
  }
}

export async function searchVectors(
  companyId: string,
  query: string,
  numNeighbors = 5,
) {
  const embedding = await generateEmbedding(query);
  return vectorSearchService.findNearestNeighbors(
    embedding,
    companyId,
    numNeighbors,
  );
}

export const deleteDocumentVectors = async (
  companyId: string,
  documentId: string,
): Promise<{ status: 'success' | 'error'; vectorsDeleted: number }> => {
  try {
    // Fetch all chunk docs for the given document
    const snapshot = await adminDb
      .collection('document_chunks')
      .where('companyId', '==', companyId)
      .where('metadata.documentId', '==', documentId)
      .get();

    if (snapshot.empty) {
      return { status: 'success', vectorsDeleted: 0 };
    }

    const chunkIds = snapshot.docs.map((doc) => doc.id);

    // Remove vectors from Azure AI Search index
    await vectorSearchService.removeDatapoints(chunkIds);

    // Delete chunk docs from Firestore in batches of 500
    for (let i = 0; i < snapshot.docs.length; i += 500) {
      const batch = adminDb.batch();
      const slice = snapshot.docs.slice(i, i + 500);
      slice.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    return { status: 'success', vectorsDeleted: chunkIds.length };
  } catch (error) {
    console.error('Error deleting document vectors:', error);
    return { status: 'error', vectorsDeleted: 0 };
  }
};
