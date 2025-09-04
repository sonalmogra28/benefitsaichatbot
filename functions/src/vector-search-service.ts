import {IndexServiceClient} from "@google-cloud/aiplatform";

const PROJECT_ID =
  process.env.VERTEX_AI_PROJECT_ID ||
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  "";
const LOCATION = process.env.VERTEX_AI_LOCATION || "us-central1";
const INDEX_ID = process.env.VERTEX_AI_INDEX_ID || "";

/**
 * Service for interacting with Vertex AI Vector Search.
 */
class VectorSearchService {
  private indexClient: IndexServiceClient;

  /**
   * Initializes the Vertex AI index client.
   */
  constructor() {
    this.indexClient = new IndexServiceClient({
      apiEndpoint: `${LOCATION}-aiplatform.googleapis.com`,
    });
  }

  /**
   * Full resource path for the index.
   * @return {string} Index resource path.
   */
  private get indexPath() {
    if (!PROJECT_ID || !INDEX_ID) {
      throw new Error("Vertex AI project or index ID is not configured");
    }
    return `projects/${PROJECT_ID}/locations/${LOCATION}/indexes/${INDEX_ID}`;
  }

  /**
   * Remove datapoints from the index.
   * @param {string[]} datapointIds IDs to remove.
   * @return {Promise<void>} Completion promise.
   */
  async removeDatapoints(datapointIds: string[]) {
    if (!datapointIds.length) return;
    const request = {
      index: this.indexPath,
      datapointIds,
    } as const;
    await this.indexClient.removeDatapoints(request);
  }
}

export const vectorSearchService = new VectorSearchService();
