import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate embedding for text using OpenAI's embedding model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text is required for embedding generation');
  }
  
  // Truncate text if too long (max ~8000 tokens, but we'll be conservative)
  const maxLength = 6000;
  const truncatedText = text.length > maxLength 
    ? `${text.substring(0, maxLength)}...` 
    : text;
  
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: truncatedText,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error('OpenAI embedding error:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }
  
  // OpenAI allows up to 2048 inputs per request
  const batchSize = 100;
  const embeddings: number[][] = [];
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: batch,
      });
      
      embeddings.push(...response.data.map((d: any) => d.embedding));
    } catch (error) {
      console.error(`Batch embedding error at index ${i}:`, error);
      throw new Error(`Failed to generate embeddings for batch starting at index ${i}`);
    }
  }
  
  return embeddings;
}

// Alias for backward compatibility
export const getEmbedding = generateEmbedding;