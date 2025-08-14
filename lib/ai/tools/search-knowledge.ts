import { tool } from 'ai';
import { z } from 'zod';
import { searchVectors } from '@/lib/vectors/pinecone';
import { buildKnowledgeContext } from '@/lib/ai/prompts';

export const searchKnowledge = tool({
  description: 'Search the knowledge base for answers to user questions about benefits, policies, and company information. Use this whenever the user asks a question that can be answered from documents.',
  parameters: z.object({
    query: z.string().describe('The user question to search for.'),
  }),
  execute: async ({ query }, { session }) => {
    try {
      const companyId = session.user.companyId;
      if (!companyId) {
        return {
          error: 'User is not associated with a company.',
        };
      }

      const searchResults = await searchVectors(companyId, query);
      const context = buildKnowledgeContext(searchResults);

      return {
        context,
        results: searchResults.map(r => ({
          title: r.metadata.documentTitle,
          score: r.score,
        })),
      };
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return {
        error: 'Failed to search knowledge base.',
      };
    }
  },
});
