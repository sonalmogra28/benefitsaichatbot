// lib/ai/vector-search.ts
import { IndexEndpointServiceClient, IndexServiceClient } from '@google-cloud/aiplatform';
import { generateEmbeddings } from '@/lib/ai/embeddings';
import { adminDb } from '@/lib/firebase/admin';

const PROJECT_ID =
  process.env.VERTEX_AI_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  '';
const LOCATION = process.env.VERTEX_AI_LOCATION || 'us-central1';
const INDEX_ID = process.env.VERTEX_AI_INDEX_ID || '';
const INDEX_ENDPOINT_ID = process.env.VERTEX_AI_INDEX_ENDPOINT_ID || '';

class VectorSearchService {
  private indexClient: IndexServiceClient;
  private indexEndpointClient: IndexEndpointServiceClient;

  constructor() {
    const clientOptions = {
      apiEndpoint: `${LOCATION}-aiplatform.googleapis.com`,
    };
    this.indexClient = new IndexServiceClient(clientOptions);
    this.indexEndpointClient = new IndexEndpointServiceClient(clientOptions);
  }

  private get indexPath() {
    if (!PROJECT_ID || !INDEX_ID) {
      throw new Error('Vertex AI project or index ID is not configured');
    }
    return `projects/${PROJECT_ID}/locations/${LOCATION}/indexes/${INDEX_ID}`;
  }

  private get endpointPath() {
    if (!PROJECT_ID || !INDEX_ENDPOINT_ID) {
      throw new Error('Vertex AI project or index endpoint ID is not configured');
    }
    return `projects/${PROJECT_ID}/locations/${LOCATION}/indexEndpoints/${INDEX_ENDPOINT_ID}`;
  }

  async upsertChunks(chunks: { id: string; embedding: number[] }[]) {
    const datapoints = chunks.map(chunk => ({
      datapointId: chunk.id,
      featureVector: chunk.embedding,
    }));

    const request = {
      index: this.indexPath,
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

  async upsertDocumentChunks(
    companyId: string,
    chunks: { id: string; text: string; metadata: { documentId: string } }[],
  ) {
    try {
      const embeddings = await generateEmbeddings(chunks.map(c => c.text));
      const datapoints = chunks.map((chunk, i) => ({
        datapointId: chunk.id,
        featureVector: embeddings[i],
        restricts: [
          { namespace: 'company_id', allowTokens: [companyId] },
          { namespace: 'document_id', allowTokens: [chunk.metadata.documentId] },
        ],
      }));

      const request = {
        index: this.indexPath,
        datapoints,
      };

      console.log(
        `Upserting ${datapoints.length} document chunks for company ${companyId}`,
      );
      await this.indexClient.upsertDatapoints(request);
      console.log('Successfully upserted document chunks to Vertex AI.');
      return datapoints.length;
    } catch (error) {
      console.error('Error upserting document chunks to Vertex AI:', error);
      throw new Error('Failed to upsert document chunks');
    }
  }

  async removeDatapoints(datapointIds: string[]) {
    const request = {
      index: this.indexPath,
      datapointIds,
    };

    try {
      console.log(`Removing ${datapointIds.length} datapoints from Vertex AI index...`);
      await this.indexClient.removeDatapoints(request);
      console.log('Successfully removed datapoints.');
    } catch (error) {
      console.error('Error removing datapoints from Vertex AI:', error);
      throw new Error('Could not remove datapoints from the vector search index.');
    }
  }

  async findNearestNeighbors(queryEmbedding: number[], numNeighbors = 5) {
    const request = {
      indexEndpoint: this.endpointPath,
      queries: [
        {
          datapoint: {
            featureVector: queryEmbedding,
          },
          neighborCount: numNeighbors,
        },
      ],
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

export const upsertDocumentChunks = (
  companyId: string,
  chunks: { id: string; text: string; metadata: { documentId: string } }[],
) => vectorSearchService.upsertDocumentChunks(companyId, chunks);

export const deleteDocumentVectors = async (documentId: string) => {
  try {
    console.log(`Deleting vectors for document ${documentId}...`);
    const docSnap = await adminDb.collection('documents').doc(documentId).get();
    const chunkCount = docSnap.exists ? docSnap.data()?.chunksCount || 0 : 0;

    if (chunkCount <= 0) {
      console.log('No chunks found for document; skipping vector deletion.');
      return;
    }

    const datapointIds = Array.from({ length: chunkCount }, (_, i) => `${documentId}-chunk-${i}`);
    await vectorSearchService.removeDatapoints(datapointIds);
    console.log(`Deleted ${datapointIds.length} vectors for document ${documentId}.`);
  } catch (error) {
    console.error(`Error deleting vectors for document ${documentId}:`, error);
    throw new Error('Failed to delete document vectors.');
  }
};

