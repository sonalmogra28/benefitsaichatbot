import { getContainer, USERS_CONTAINER } from '@/lib/azure/cosmos-db';
import { generateEmbedding } from '@/lib/ai/embeddings';
import { vectorSearchService } from './vector-search';

// Threshold for a direct answer from the knowledge base
const DIRECT_ANSWER_SIMILARITY_THRESHOLD = 0.95;

class QueryOptimizer {
  /**
   * Checks for a static, pre-defined answer to a common question.
   * This avoids hitting the LLM for simple, repetitive queries.
   */
  async findStaticAnswer(
    query: string,
    companyId: string,
  ): Promise<string | null> {
    try {
      // Query Cosmos DB for FAQ entries
      const faqsContainer = await getContainer('FAQs');
      const { resources: faqs } = await faqsContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.companyId = @companyId AND ARRAY_CONTAINS(c.keywords, @query)',
          parameters: [
            { name: '@companyId', value: companyId },
            { name: '@query', value: query.toLowerCase().trim() }
          ]
        })
        .fetchAll();

      if (faqs.length > 0 && faqs[0].answer) {
        return faqs[0].answer;
      }

      // Placeholder for a more advanced vector-based FAQ search
      // const queryEmbedding = await generateEmbedding(query);
      // const similarFAQs = await vectorSearchService.findNearestNeighbors(
      //   queryEmbedding,
      //   companyId,
      //   1,
      //   'faqs' // Assuming a separate index for FAQs
      // );
      //
      // if (similarFAQs.length > 0 && similarFAQs[0].score > DIRECT_ANSWER_SIMILARITY_THRESHOLD) {
      //   return similarFAQs[0].chunk.content;
      // }

      return null;
    } catch (error) {
      console.error('Error finding static answer:', error);
      return null;
    }
  }
}

export const queryOptimizer = new QueryOptimizer();
