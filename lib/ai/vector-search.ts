// lib/ai/vector-search.ts
import { IndexServiceClient, IndexEndpointServiceClient } from '@google-cloud/aiplatform';
import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { generateEmbeddings } from './embeddings';

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'your-gcp-project-id';
const LOCATION = 'us-central1'; // Or your GCP region

class VectorSearchService {
  private indexClient: IndexServiceClient;
  private indexEndpointClient: IndexEndpointServiceClient;
  private indexId: string = 'your-vector-search-index-id'; // Replace with your Index ID
  private indexEndpointId: string = 'your-vector-search-index-endpoint-id'; // Replace with your Index Endpoint ID

  constructor() {
    const clientOptions = {
      apiEndpoint: `${LOCATION}-aiplatform.googleapis.com`,
    };
    this.indexClient = new IndexServiceClient(clientOptions);
    this.indexEndpointClient = new IndexEndpointServiceClient(clientOptions);
  }

  async upsertChunks(chunks: { id: string; embedding: number[] }[]) {
    const datapoints = chunks.map(chunk => ({
      datapoint_id: chunk.id,
      feature_vector: chunk.embedding,
    }));

    const request = {
      index: `projects/${PROJECT_ID}/locations/${LOCATION}/indexes/${this.indexId}`,
      datapoints,
    };

    try {
      console.log('Upserting datapoints to Vertex AI Vector Search...');
      await this.indexClient.upsertDatapoints(request);
      console.log('Successfully upserted datapoints.');
    } catch (error) {
      console.error('Error upserting datapoints to Vertex AI:', error);
      throw new Error('Could not update the vector search index.');
    }
  }

  async findNearestNeighbors(queryEmbedding: number[], numNeighbors: number = 5) {
    const endpoint = `projects/${PROJECT_ID}/locations/${LOCATION}/indexEndpoints/${this.indexEndpointId}`;

    const request = {
      indexEndpoint: endpoint,
      queries: [{
        datapoint: {
          featureVector: queryEmbedding,
        },
        neighborCount: numNeighbors,
      }],
    };

    try {
      const [response] = await this.indexEndpointClient.findNeighbors(request);
      if (response.nearestNeighbors && response.nearestNeighbors.length > 0) {
        return response.nearestNeighbors[0].neighbors;
      }
      return [];
    } catch (error) {
      console.error('Error finding nearest neighbors in Vertex AI:', error);
      throw new Error('Could not perform the vector search.');
    }
  }
}

export const vectorSearchService = new VectorSearchService();
export async function upsertDocumentChunks(
  companyId: string,
  chunks: { id: string; text: string; metadata?: Record<string, unknown> }[],
): Promise<{ status: 'success' | 'error'; vectorsUpserted: number }> {
  if (!chunks.length) {
    return { status: 'success', vectorsUpserted: 0 };
  }

  try {
    const texts = chunks.map(c => c.text);
    const embeddings = await generateEmbeddings(texts);

    // Store chunk metadata in Firestore in batches of 500
    for (let i = 0; i < chunks.length; i += 500) {
      const batch = adminDb.batch();
      const slice = chunks.slice(i, i + 500);
      slice.forEach((chunk, idx) => {
        const docRef = adminDb.collection('document_chunks').doc(chunk.id);
        batch.set(docRef, {
          id: chunk.id,
          companyId,
          content: chunk.text,
          metadata: chunk.metadata,
          createdAt: FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
    }

    // Upsert embeddings to Vertex AI in batches of 100
    let upserted = 0;
    for (let i = 0; i < chunks.length; i += 100) {
      const slice = chunks.slice(i, i + 100).map((chunk, idx) => ({
        id: chunk.id,
        embedding: embeddings[i + idx],
      }));
      if (slice.length > 0) {
        await vectorSearchService.upsertChunks(slice);
        upserted += slice.length;
      }
    }

    return { status: 'success', vectorsUpserted: upserted };
  } catch (error) {
    console.error('Error upserting document chunks:', error);
    return { status: 'error', vectorsUpserted: 0 };
  }
}

export const deleteDocumentVectors = async (documentId: string) => {
  console.log(`- Deleting vector for document ${documentId}`);
  return Promise.resolve();
};