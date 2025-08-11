// lib/vectors/vertexai.ts
import { AiPlatform, VectorSearch } from '@google-cloud/aiplatform';

const {
  GCP_PROJECT,
  GCP_REGION,
  VERTEX_AI_INDEX_ID,
  VERTEX_AI_INDEX_ENDPOINT_ID,
} = process.env;

if (!GCP_PROJECT || !GCP_REGION || !VERTEX_AI_INDEX_ID || !VERTEX_AI_INDEX_ENDPOINT_ID) {
  throw new Error('Missing Vertex AI Vector Search configuration.');
}

const aiplatform = new AiPlatform({
  project: GCP_PROJECT,
  location: GCP_REGION,
});

const vectorSearch = new VectorSearch(aiplatform);

const index = vectorSearch.getIndex({ id: VERTEX_AI_INDEX_ID });
const indexEndpoint = vectorSearch.getIndexEndpoint({ id: VERTEX_AI_INDEX_ENDPOINT_ID });

export const vertexAIVectorSearch = {
  async search(vector: number[], topK: number = 10) {
    const request = {
      indexEndpoint: indexEndpoint.path,
      queries: [{
        datapoint: {
          datapointId: 'query',
          featureVector: vector,
        },
        neighborCount: topK,
      }],
    };

    const [response] = await indexEndpoint.findNeighbors(request);
    return response;
  },

  async upsert(datapoints: { datapointId: string; featureVector: number[] }[]) {
    const request = {
      index: index.path,
      datapoints,
    };
    await index.upsertDatapoints(request);
  },
};
