import { tool } from 'ai';
import { z } from 'zod';
import { searchVectors } from '@/lib/ai/vector-search';
// Function to build knowledge context from search results
const buildKnowledgeContext = (results: any[]) => {
  return results
    .map(
      (result) => `${result.metadata?.title || 'Document'}: ${result.content}`,
    )
    .join('\n\n');
};

export const searchKnowledge = tool({
  description:
    'Search the knowledge base for answers to user questions about benefits, policies, and company information. Use this whenever the user asks a question that can be answered from documents.',
  parameters: z.object({
    query: z.string().describe('The user question to search for.'),
  }),
  execute: async ({ query }: { query: string }, { session }: any) => {
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
        results: searchResults.map((r: any) => ({
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
