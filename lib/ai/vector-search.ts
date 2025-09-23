// lib/ai/vector-search.ts

import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
import { getContainer } from '@/lib/azure/cosmos-db';
import { generateEmbedding, generateEmbeddings } from './embeddings';
import { DefaultAzureCredential } from '@azure/identity';

const AZURE_SEARCH_ENDPOINT = process.env.AZURE_SEARCH_ENDPOINT || '';
const AZURE_SEARCH_API_KEY = process.env.AZURE_SEARCH_API_KEY || '';
const AZURE_SEARCH_INDEX_NAME = process.env.AZURE_SEARCH_INDEX_NAME || 'document-chunks';

class VectorSearchService {
  private searchClient: any;

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

export const getDocumentChunks = async (
  companyId: string,
  documentId: string,
  limit: number = 100,
  offset: number = 0
): Promise<{
  chunks: Array<{
    id: string;
    content: string;
    metadata: Record<string, unknown>;
    embedding: number[];
    createdAt: string;
  }>;
  total: number;
}> => {
  try {
    const documentsContainer = await getContainer('Documents');
    
    // Get total count
    const countQuery = {
      query: "SELECT VALUE COUNT(1) FROM c WHERE c.companyId = @companyId AND c.metadata.documentId = @documentId",
      parameters: [
        { name: '@companyId', value: companyId },
        { name: '@documentId', value: documentId }
      ]
    };
    
    const { resources: countResult } = await documentsContainer.items.query(countQuery).fetchAll();
    const total = countResult[0] || 0;

    // Get chunks with pagination
    const query = {
      query: "SELECT * FROM c WHERE c.companyId = @companyId AND c.metadata.documentId = @documentId ORDER BY c.createdAt OFFSET @offset LIMIT @limit",
      parameters: [
        { name: '@companyId', value: companyId },
        { name: '@documentId', value: documentId },
        { name: '@offset', value: offset },
        { name: '@limit', value: limit }
      ]
    };

    const { resources: chunks } = await documentsContainer.items.query(query).fetchAll();

    return {
      chunks: chunks.map((chunk: any) => ({
        id: chunk.id,
        content: chunk.content,
        metadata: chunk.metadata || {},
        embedding: chunk.embedding || [],
        createdAt: chunk.createdAt
      })),
      total
    };
  } catch (error) {
    console.error('Error retrieving document chunks:', error);
    return { chunks: [], total: 0 };
  }
};

export const batchUpsertChunks = async (
  companyId: string,
  chunks: Array<{
    id: string;
    content: string;
    metadata: Record<string, unknown>;
    embedding: number[];
  }>
): Promise<{ status: 'success' | 'error'; chunksUpserted: number }> => {
  try {
    if (chunks.length === 0) {
      return { status: 'success', chunksUpserted: 0 };
    }

    const documentsContainer = await getContainer('Documents');
    let upserted = 0;

    // Process chunks in batches of 100
    for (let i = 0; i < chunks.length; i += 100) {
      const batch = chunks.slice(i, i + 100);
      
      // Upsert each chunk individually (Cosmos DB doesn't have batch upsert)
      for (const chunk of batch) {
        try {
          const chunkData = {
            id: chunk.id,
            companyId,
            content: chunk.content,
            metadata: chunk.metadata,
            embedding: chunk.embedding,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          // Try to update first, if it fails, create new
          try {
            await documentsContainer.item(chunk.id, companyId).replace(chunkData);
          } catch (error: any) {
            if (error.code === 404) {
              // Document doesn't exist, create it
              await documentsContainer.items.create(chunkData);
            } else {
              throw error;
            }
          }
          
          upserted++;
        } catch (error) {
          console.error(`Failed to upsert chunk ${chunk.id}:`, error);
          // Continue with other chunks even if one fails
        }
      }
    }

    console.log(`Upserted ${upserted} chunks for company ${companyId}`);
    return { status: 'success', chunksUpserted: upserted };
  } catch (error) {
    console.error('Error batch upserting chunks:', error);
    return { status: 'error', chunksUpserted: 0 };
  }
};

export const deleteDocumentVectors = async (
  companyId: string,
  documentId: string,
): Promise<{ status: 'success' | 'error'; vectorsDeleted: number }> => {
  try {
    // Fetch all chunk docs for the given document from Azure Cosmos DB
    const documentsContainer = await getContainer('Documents');
    const query = {
      query: "SELECT * FROM c WHERE c.companyId = @companyId AND c.metadata.documentId = @documentId",
      parameters: [
        { name: '@companyId', value: companyId },
        { name: '@documentId', value: documentId }
      ]
    };

    const { resources: chunks } = await documentsContainer.items.query(query).fetchAll();

    if (chunks.length === 0) {
      return { status: 'success', vectorsDeleted: 0 };
    }

    const chunkIds = chunks.map((chunk: any) => chunk.id);

    // Remove vectors from Azure AI Search index
    await vectorSearchService.removeDatapoints(chunkIds);

    // Delete chunk docs from Cosmos DB in batches of 100
    for (let i = 0; i < chunks.length; i += 100) {
      const slice = chunks.slice(i, i + 100);
      
      // Delete each chunk individually (Cosmos DB doesn't have batch delete)
      for (const chunk of slice) {
        try {
          await documentsContainer.item(chunk.id, companyId).delete();
        } catch (error) {
          console.error(`Failed to delete chunk ${chunk.id}:`, error);
          // Continue with other chunks even if one fails
        }
      }
    }

    console.log(`Deleted ${chunkIds.length} document vectors for document ${documentId}`);
    return { status: 'success', vectorsDeleted: chunkIds.length };
  } catch (error) {
    console.error('Error deleting document vectors:', error);
    return { status: 'error', vectorsDeleted: 0 };
  }
};
