import {
  IndexEndpointServiceClient,
  MatchServiceClient,
} from '@google-cloud/aiplatform';
import { GoogleAuth } from 'google-auth-library';
import { getEmbedding } from './embeddings';

const project = process.env.GOOGLE_CLOUD_PROJECT || '';
const location = 'us-central1';
const indexEndpointId = process.env.VERTEX_AI_INDEX_ENDPOINT_ID || '';
const deployedIndexId = process.env.VERTEX_AI_DEPLOYED_INDEX_ID || '';

const auth = new GoogleAuth({
  scopes: 'https://www.googleapis.com/auth/cloud-platform',
});

const indexEndpointClient = new IndexEndpointServiceClient({
  auth,
  apiEndpoint: `${location}-aiplatform.googleapis.com`,
});

const matchClient = new MatchServiceClient({
  auth,
  apiEndpoint: `${location}-aiplatform.googleapis.com`,
});

export async function upsertDocumentChunks(
  companyId: string,
  chunks: Array<{ id: string; text: string; metadata: any }>,
) {
  const indexEndpoint = `projects/${project}/locations/${location}/indexEndpoints/${indexEndpointId}`;

  const datapoints = await Promise.all(
    chunks.map(async (chunk) => {
      const embedding = await getEmbedding(chunk.text);
      return {
        datapoint_id: chunk.id,
        feature_vector: embedding,
        restricts: [
          {
            namespace: 'companyId',
            allow_list: [companyId],
          },
        ],
        // TODO: Add metadata once supported by the API
      };
    }),
  );

  const request = {
    indexEndpoint,
    datapoints,
  };

  // @ts-ignore
  await indexEndpointClient.upsertDatapoints({ request });
  return chunks.length;
}

export async function searchVectors(
  companyId: string,
  query: string,
  topK = 5,
) {
  const queryEmbedding = await getEmbedding(query);

  const request = {
    indexEndpoint: `projects/${project}/locations/${location}/indexEndpoints/${indexEndpointId}`,
    deployedIndexId,
    queries: [
      {
        datapoint: {
          feature_vector: queryEmbedding,
        },
        neighborCount: topK,
        string_filter: [
          {
            namespace: 'companyId',
            allow_list: [companyId],
          },
        ],
      },
    ],
  };

  // @ts-ignore
  const [response] = await matchClient.findNeighbors(request);

  if (!response.nearestNeighbors || !response.nearestNeighbors[0]) {
    return [];
  }

  return response.nearestNeighbors[0].neighbors.map((neighbor: any) => ({
    id: neighbor.datapoint.datapointId,
    score: neighbor.distance,
    metadata: {
      // TODO: Retrieve metadata from Firestore or another source
    },
  }));
}

export async function deleteDocumentVectors(
  companyId: string,
  documentId: string,
) {
  // Vertex AI Vector Search does not yet support deleting by metadata filter.
  // This is a placeholder for when that functionality is available.
  // For now, you would need to find all chunk IDs associated with the documentId
  // and delete them individually.
  console.warn(`Deletion for documentId ${documentId} in company ${companyId} is not yet implemented for Vertex AI.`);
  return;
}
