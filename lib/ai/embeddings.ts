import OpenAI from 'openai';

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || '';
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY || '';
const AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT =
  process.env.AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT || 'text-embedding-3-small';

function getAzureOpenAIClient(): OpenAI {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
    throw new Error('Azure OpenAI endpoint or API key not configured');
  }
  return new OpenAI({
    apiKey: AZURE_OPENAI_API_KEY,
    baseURL: `${AZURE_OPENAI_ENDPOINT}/openai/deployments`,
    defaultHeaders: {
      'api-key': AZURE_OPENAI_API_KEY,
    },
    defaultQuery: { 'api-version': '2024-05-01-preview' },
  });
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text is required for embedding generation');
  }

  const maxLength = 6000;
  const truncatedText =
    text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;

  try {
    const client = getAzureOpenAIClient();
    const result = await client.embeddings.create({
      model: AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT,
      input: truncatedText,
    });
    return result.data?.[0]?.embedding || [];
  } catch (error) {
    logger.error('Azure OpenAI embedding error:', error);
    throw new Error('Failed to generate embedding');
  }
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }
  try {
    const client = getAzureOpenAIClient();
    const result = await client.embeddings.create({
      model: AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT,
      input: texts,
    });
    return result.data?.map((d) => d.embedding) || [];
  } catch (error) {
    logger.error('Azure OpenAI batch embedding error:', error);
    throw new Error('Failed to generate embeddings');
  }
}

export const getEmbedding = generateEmbedding;
