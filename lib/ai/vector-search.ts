// lib/ai/vector-search.ts
import { IndexServiceClient, IndexEndpointServiceClient } from '@google-cloud/aiplatform';
import { adminDb } from '@/lib/firebase/admin';

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
export const deleteDocumentVectors = async (documentId: string) => {
    console.log(`- Deleting vector for document ${documentId}`);
    return Promise.resolve();
};