// RAG (Retrieval-Augmented Generation) System for Benefits Documents
import { db, storage } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getModel, SYSTEM_PROMPTS } from './vertex-config';

export interface DocumentChunk {
  id: string;
  documentId: string;
  companyId: string;
  content: string;
  embedding?: number[];
  metadata: {
    title: string;
    section?: string;
    pageNumber?: number;
    documentType?: string;
    uploadedAt: Date;
  };
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
}

class RAGSystem {
  private embeddingModel: any;
  
  constructor() {
    // Initialize embedding model
    this.embeddingModel = this.initializeEmbeddingModel();
  }

  private initializeEmbeddingModel() {
    try {
      const model = getModel('EMBEDDING');
      return model;
    } catch (error) {
      console.warn('Embedding model initialization failed, using fallback');
      return null;
    }
  }

  /**
   * Process and store a document for RAG
   */
  async processDocument(
    documentId: string,
    companyId: string,
    content: string,
    metadata: any
  ): Promise<void> {
    try {
      // Split document into chunks
      const chunks = this.splitIntoChunks(content);
      
      // Process each chunk
      const chunkPromises = chunks.map(async (chunk, index) => {
        const chunkId = `${documentId}_chunk_${index}`;
        
        // Generate embedding if model is available
        let embedding: number[] | undefined;
        if (this.embeddingModel) {
          embedding = await this.generateEmbedding(chunk);
        }
        
        // Store chunk in Firestore
        const chunkData: DocumentChunk = {
          id: chunkId,
          documentId,
          companyId,
          content: chunk,
          embedding,
          metadata: {
            ...metadata,
            section: `Chunk ${index + 1}/${chunks.length}`,
          },
        };
        
        await db
          .collection('document_chunks')
          .doc(chunkId)
          .set({
            ...chunkData,
            createdAt: FieldValue.serverTimestamp(),
          });
      });
      
      await Promise.all(chunkPromises);
      
      // Update document status
      await db.collection('documents').doc(documentId).update({
        ragProcessed: true,
        chunkCount: chunks.length,
        processedAt: FieldValue.serverTimestamp(),
      });
      
      console.log(`✅ Processed ${chunks.length} chunks for document ${documentId}`);
    } catch (error) {
      console.error('Error processing document for RAG:', error);
      throw error;
    }
  }

  /**
   * Search for relevant document chunks
   */
  async search(
    query: string,
    companyId: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      // Generate query embedding
      const queryEmbedding = this.embeddingModel 
        ? await this.generateEmbedding(query)
        : null;
      
      if (queryEmbedding) {
        // Vector similarity search
        return await this.vectorSearch(queryEmbedding, companyId, limit);
      } else {
        // Fallback to keyword search
        return await this.keywordSearch(query, companyId, limit);
      }
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  /**
   * Vector similarity search using embeddings
   */
  private async vectorSearch(
    queryEmbedding: number[],
    companyId: string,
    limit: number
  ): Promise<SearchResult[]> {
    // Note: In production, use Vertex AI Vector Search or similar service
    // This is a simplified implementation
    
    const chunksSnapshot = await db
      .collection('document_chunks')
      .where('companyId', '==', companyId)
      .where('embedding', '!=', null)
      .limit(limit * 2) // Get more to filter by similarity
      .get();
    
    const results: SearchResult[] = [];
    
    chunksSnapshot.docs.forEach(doc => {
      const chunk = doc.data() as DocumentChunk;
      if (chunk.embedding) {
        const score = this.cosineSimilarity(queryEmbedding, chunk.embedding);
        results.push({ chunk, score });
      }
    });
    
    // Sort by score and return top results
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Keyword-based search fallback
   */
  private async keywordSearch(
    query: string,
    companyId: string,
    limit: number
  ): Promise<SearchResult[]> {
    // Simple keyword matching
    const keywords = query.toLowerCase().split(' ').filter(k => k.length > 2);
    
    const chunksSnapshot = await db
      .collection('document_chunks')
      .where('companyId', '==', companyId)
      .limit(limit * 3)
      .get();
    
    const results: SearchResult[] = [];
    
    chunksSnapshot.docs.forEach(doc => {
      const chunk = doc.data() as DocumentChunk;
      const content = chunk.content.toLowerCase();
      
      // Calculate relevance score based on keyword matches
      let score = 0;
      keywords.forEach(keyword => {
        const matches = (content.match(new RegExp(keyword, 'g')) || []).length;
        score += matches;
      });
      
      if (score > 0) {
        results.push({ chunk, score });
      }
    });
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.embeddingModel) {
      // Return mock embedding for development
      return Array(768).fill(0).map(() => Math.random());
    }
    
    try {
      const result = await this.embeddingModel.embedContent({
        content: { parts: [{ text }] },
      });
      
      return result.embedding.values;
    } catch (error) {
      console.error('Embedding generation error:', error);
      // Return mock embedding as fallback
      return Array(768).fill(0).map(() => Math.random());
    }
  }

  /**
   * Split document into chunks for processing
   */
  private splitIntoChunks(content: string, chunkSize: number = 1000): string[] {
    const chunks: string[] = [];
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) return 0;
    
    return dotProduct / (normA * normB);
  }

  /**
   * Generate context from search results for AI response
   */
  generateContext(results: SearchResult[]): string {
    if (results.length === 0) {
      return 'No relevant documents found.';
    }
    
    const context = results
      .map((result, index) => {
        const { chunk } = result;
        return `
[Document ${index + 1}]
Title: ${chunk.metadata.title}
Section: ${chunk.metadata.section || 'General'}
Content: ${chunk.content}
---`;
      })
      .join('\n');
    
    return `Based on the following relevant documents:\n\n${context}`;
  }
}

// Export singleton instance
export const ragSystem = new RAGSystem();

// Export types
export type { DocumentChunk, SearchResult };