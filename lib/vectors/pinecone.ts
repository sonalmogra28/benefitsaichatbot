import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient: Pinecone | null = null;

/**
 * Get or create Pinecone client singleton
 */
export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY environment variable is not set');
    }
    
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }
  
  return pineconeClient;
}

/**
 * Get Pinecone index for benefits AI
 */
export function getBenefitsIndex() {
  const client = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX_NAME || 'benefits-ai';
  return client.index(indexName);
}

/**
 * Get namespace for a specific company
 */
export function getCompanyNamespace(companyId: string) {
  const index = getBenefitsIndex();
  return index.namespace(companyId);
}

/**
 * Document chunk interface for vector storage
 */
export interface DocumentChunk {
  id: string;
  text: string;
  metadata: {
    documentId: string;
    companyId: string;
    documentTitle: string;
    pageNumber?: number;
    chunkIndex: number;
    category?: string;
    tags?: string[];
  };
  embedding?: number[];
}

/**
 * Upsert document chunks to Pinecone
 */
export async function upsertDocumentChunks(
  companyId: string,
  chunks: DocumentChunk[]
) {
  const namespace = getCompanyNamespace(companyId);
  
  // Prepare vectors for upsert
  const vectors = chunks
    .filter(chunk => chunk.embedding && chunk.embedding.length > 0)
    .map(chunk => ({
      id: chunk.id,
      values: chunk.embedding!,
      metadata: {
        ...chunk.metadata,
        text: chunk.text, // Store text in metadata for retrieval
      }
    }));
  
  if (vectors.length === 0) {
    throw new Error('No chunks with embeddings to upsert');
  }
  
  // Upsert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    await namespace.upsert(batch);
  }
  
  return vectors.length;
}

/**
 * Search for relevant document chunks
 */
export async function searchDocuments(
  companyId: string,
  queryEmbedding: number[],
  options: {
    topK?: number;
    filter?: Record<string, any>;
    includeMetadata?: boolean;
  } = {}
) {
  const namespace = getCompanyNamespace(companyId);
  
  const results = await namespace.query({
    vector: queryEmbedding,
    topK: options.topK || 5,
    filter: options.filter,
    includeMetadata: options.includeMetadata !== false,
  });
  
  return results.matches || [];
}

/**
 * Delete all vectors for a document
 */
export async function deleteDocument(
  companyId: string,
  documentId: string
) {
  const namespace = getCompanyNamespace(companyId);
  
  // Delete all chunks for this document
  await namespace.deleteMany({
    filter: {
      documentId: { $eq: documentId }
    }
  });
}

/**
 * Get index statistics for a company
 */
export async function getCompanyIndexStats(companyId: string) {
  const index = getBenefitsIndex();
  const stats = await index.describeIndexStats();
  
  // Get namespace-specific stats if available
  const namespaceStats = stats.namespaces?.[companyId];
  
  return {
    totalVectors: namespaceStats?.recordCount || 0,
    indexDimension: stats.dimension,
    indexFullness: stats.indexFullness,
  };
}