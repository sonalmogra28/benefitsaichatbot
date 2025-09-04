import type { GenerativeModel } from '@google-cloud/vertexai';
import { getVertexAI, AI_MODELS } from './vertex-config';

// --- LAZY INITIALIZATION ---
let embeddingModel: GenerativeModel | null = null;

function getEmbeddingModel() {
  if (!embeddingModel) {
    const vertex = getVertexAI();
    embeddingModel = vertex.getGenerativeModel({ model: AI_MODELS.EMBEDDING });
  }
  return embeddingModel;
}
// --- END LAZY INITIALIZATION ---

/**
 * Generate embedding for text using Vertex AI's embedding model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text is required for embedding generation');
  }

  // Truncate text if too long (max ~8000 tokens, but we'll be conservative)
  const maxLength = 6000;
  const truncatedText =
    text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;

  try {
    const model = getEmbeddingModel();
    const result = await model.embedContent({
      content: { parts: [{ text: truncatedText }] },
    });
    return result.embedding?.values ?? [];
  } catch (error) {
    console.error('Vertex AI embedding error:', error);
    throw new Error('Failed to generate embedding');
  }
}

/**
 * Generate embeddings for multiple texts using Vertex AI batch API
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  try {
    const model = getEmbeddingModel();
    const response = await model.batchEmbedContents({
      requests: texts.map((text) => ({
        content: { parts: [{ text }] },
      })),
    });
    return response.embeddings?.map((e) => e.values) ?? [];
  } catch (error) {
    console.error('Vertex AI batch embedding error:', error);
    throw new Error('Failed to generate embeddings');
  }
}

// Alias for backward compatibility
export const getEmbedding = generateEmbedding;
