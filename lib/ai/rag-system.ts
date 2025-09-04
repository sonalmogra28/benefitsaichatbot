import { getModel } from './vertex-config';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { GenerativeModel } from '@google-cloud/vertexai';

interface DocumentMetadata {
  title: string;
  documentType: 'pdf' | 'docx' | 'txt';
  uploadedAt: Date;
  [key: string]: any; 
}

interface Chunk {
  id: string;
  documentId: string;
  companyId: string;
  content: string;
  embedding?: number[];
  metadata: DocumentMetadata & { section: string };
}

interface SearchResult {
  chunk: Chunk;
  score: number;
}

class RAGSystem {
  private embeddingModel: GenerativeModel | null;

  constructor() {
    this.embeddingModel = this.initializeEmbeddingModel();
  }

  private initializeEmbeddingModel(): GenerativeModel | null {
    try {
      const model = getModel('EMBEDDING');
      return model;
    } catch (error) {
      console.warn('Embedding model could not be initialized. RAG will use keyword search.');
      return null;
    }
  }

  async processDocument(
    documentId: string,
    companyId: string,
    content: string,
    metadata: DocumentMetadata
  ): Promise<void> {
    try {
      const chunks = this.splitIntoChunks(content);
      
      const chunkPromises = chunks.map(async (chunk, index) => {
        const chunkId = `${documentId}_chunk_${index}`;
        
        let embedding: number[] | undefined;
        if (this.embeddingModel) {
          embedding = await this.generateEmbedding(chunk);
        }
        
        const chunkData: Chunk = {
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
        
        await adminDb
          .collection('document_chunks')
          .doc(chunkId)
          .set({
            ...chunkData,
            createdAt: FieldValue.serverTimestamp(),
          });
      });
      
      await Promise.all(chunkPromises);
      
      await adminDb.collection('documents').doc(documentId).update({
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

  async search(
    query: string, 
    companyId: string, 
    limit: number = 5
  ): Promise<SearchResult[]> {
    try {
      const queryEmbedding = this.embeddingModel 
        ? await this.generateEmbedding(query)
        : undefined;
      
      if (queryEmbedding) {
        return await this.vectorSearch(queryEmbedding, companyId, limit);
      } else {
        return await this.keywordSearch(query, companyId, limit);
      }
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  private async vectorSearch(
    queryEmbedding: number[], 
    companyId: string, 
    limit: number
  ): Promise<SearchResult[]> {
    const chunksSnapshot = await adminDb
      .collection('document_chunks')
      .where('companyId', '==', companyId)
      .where('embedding', '!=', null)
      .limit(limit * 2) 
      .get();
    
    const results: SearchResult[] = [];
    
    chunksSnapshot.docs.forEach((doc) => {
      const chunk = doc.data() as Chunk;
      if (chunk.embedding) {
        const score = this.cosineSimilarity(queryEmbedding, chunk.embedding);
        results.push({ chunk, score });
      }
    });
    
    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private async keywordSearch(
    query: string, 
    companyId: string, 
    limit: number
  ): Promise<SearchResult[]> {
    const keywords = query.toLowerCase().split(' ').filter(k => k.length > 2);
    
    const chunksSnapshot = await adminDb
      .collection('document_chunks')
      .where('companyId', '==', companyId)
      .limit(limit * 3)
      .get();
    
    const results: SearchResult[] = [];
    
    chunksSnapshot.docs.forEach((doc) => {
      const chunk = doc.data() as Chunk;
      const content = chunk.content.toLowerCase();
      
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

  private async generateEmbedding(text: string): Promise<number[]> {
    if (!this.embeddingModel) {
      return Array(768).fill(0).map(() => Math.random());
    }
    
    try {
      const result = await this.embeddingModel.embedContent({
        content: { parts: [{ text }] },
      });
      
      return result.embedding.values;
    } catch (error) {
      console.error('Embedding generation error:', error);
      return Array(768).fill(0).map(() => Math.random());
    }
  }

  splitIntoChunks(content: string, chunkSize: number = 1000): string[] {
    const chunks: string[] = [];
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [content];
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > chunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += ` ${sentence}`;
      }
    }
    
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

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

export const ragSystem = new RAGSystem();
