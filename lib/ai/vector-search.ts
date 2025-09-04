// lib/ai/vector-search.ts

import {
  IndexServiceClient,
  IndexEndpointServiceClient,
} from '@google-cloud/aiplatform';
import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { generateEmbeddings } from './embeddings';

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
      throw new Error(
        'Vertex AI project or index endpoint ID is not configured',
      );
    }
    return `projects/${PROJECT_ID}/locations/${LOCATION}/indexEndpoints/${INDEX_ENDPOINT_ID}`;
  }

  async upsertChunks(chunks: { id: string; embedding: number[] }[]) {
    const datapoints = chunks.map((chunk) => ({
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
      const embeddings = await generateEmbeddings(chunks.map((c) => c.text));
      const datapoints = chunks.map((chunk, i) => ({
        datapointId: chunk.id,
        featureVector: embeddings[i],
        restricts: [
          { namespace: 'company_id', allowTokens: [companyId] },
          {
            namespace: 'document_id',
            allowTokens: [chunk.metadata.documentId],
          },
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
      console.log(
        `Removing ${datapointIds.length} datapoints from Vertex AI index...`,
      );
      await this.indexClient.removeDatapoints(request);
      console.log('Successfully removed datapoints.');
    } catch (error) {
      console.error('Error removing datapoints from Vertex AI:', error);
      throw new Error(
        'Could not remove datapoints from the vector search index.',
      );
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

export async function upsertDocumentChunks(
  companyId: string,
  chunks: { id: string; text: string; metadata?: Record<string, unknown> }[],
): Promise<{ status: 'success' | 'error'; vectorsUpserted: number }> {
  if (!chunks.length) {
    return { status: 'success', vectorsUpserted: 0 };
  }

  try {
    const texts = chunks.map((c) => c.text);
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

    // Remove vectors from Vertex AI index
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
