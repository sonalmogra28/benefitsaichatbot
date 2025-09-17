import { extractText } from 'unpdf';
import { getRepositories } from '@/lib/azure/cosmos';
import { getStorageServices } from '@/lib/azure/storage';
import { azureOpenAIService } from '@/lib/azure/openai';
import { notificationService } from '@/lib/services/notification.service';
import { logger } from '@/lib/logging/logger';

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  metadata: {
    chunkIndex: number;
    totalChunks: number;
    startChar: number;
    endChar: number;
    fileType: string;
    fileName: string;
    companyId: string;
    userId: string;
  };
  createdAt: string;
}

export interface ProcessedDocument {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  extractedText: string;
  chunks: DocumentChunk[];
  processingTime: number;
  error?: string;
  metadata: {
    fileType: string;
    fileName: string;
    fileSize: number;
    companyId: string;
    userId: string;
  };
}

/**
 * Process a document: extract text, chunk it, generate embeddings, and store in Azure AI Search
 */
export async function processDocument(documentId: string): Promise<ProcessedDocument> {
  const startTime = Date.now();
  let document: any;

  try {
    logger.info('Starting document processing', { documentId });

    // Fetch document from Cosmos DB
    const repositories = await getRepositories();
    document = await repositories.documents.getById(documentId);

    if (!document) {
      throw new Error('Document not found');
    }

    if (!document.fileUrl) {
      throw new Error('Document has no file URL');
    }

    // Update document status to processing
    await repositories.documents.update(documentId, {
      ...document,
      status: 'processing',
      processingStartedAt: new Date().toISOString()
    });

    // Download file from Azure Blob Storage
    const storageServices = await getStorageServices();
    const fileBuffer = await storageServices.downloadFile(document.fileUrl);

    // Extract text based on file type
    let extractedText = '';

    if (document.fileType === 'application/pdf') {
      const { text } = await extractText(fileBuffer);
      extractedText = Array.isArray(text) ? text.join('\n') : text;
    } else if (document.fileType === 'text/plain') {
      extractedText = new TextDecoder().decode(fileBuffer);
    } else if (document.fileType?.includes('word') || document.fileType?.includes('document')) {
      // For Word documents, we'll need a different approach
      // For now, throw an error
      throw new Error(`Word document processing not yet implemented: ${document.fileType}`);
    } else {
      throw new Error(`Unsupported file type: ${document.fileType}`);
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text content extracted from document');
    }

    logger.info('Text extracted successfully', {
      documentId,
      textLength: extractedText.length,
      fileType: document.fileType
    });

    // Chunk the text
    const chunks = await chunkText(extractedText, {
      documentId,
      fileType: document.fileType,
      fileName: document.fileName,
      companyId: document.companyId,
      userId: document.userId
    });

    logger.info('Text chunked successfully', {
      documentId,
      chunkCount: chunks.length
    });

    // Generate embeddings for each chunk
    const chunksWithEmbeddings = await generateChunkEmbeddings(chunks);

    logger.info('Embeddings generated successfully', {
      documentId,
      chunkCount: chunksWithEmbeddings.length
    });

    // Store chunks in Cosmos DB
    for (const chunk of chunksWithEmbeddings) {
      await repositories.documentChunks.create(chunk);
    }

    // Update document status to completed
    const processingTime = Date.now() - startTime;
    const processedDocument: ProcessedDocument = {
      id: documentId,
      status: 'completed',
      extractedText,
      chunks: chunksWithEmbeddings,
      processingTime,
      metadata: {
        fileType: document.fileType,
        fileName: document.fileName,
        fileSize: document.fileSize || 0,
        companyId: document.companyId,
        userId: document.userId
      }
    };

    await repositories.documents.update(documentId, {
      ...document,
      status: 'completed',
      processingCompletedAt: new Date().toISOString(),
      processingTime,
      chunkCount: chunksWithEmbeddings.length,
      extractedTextLength: extractedText.length
    });

    // Send notification to user
    try {
      await notificationService.sendInApp(
        document.userId,
        'Document Processing Complete',
        `Your document "${document.fileName}" has been processed successfully and is now searchable.`
      );
    } catch (notificationError) {
      logger.warn('Failed to send notification', { error: notificationError, documentId });
    }

    logger.info('Document processing completed successfully', {
      documentId,
      processingTime,
      chunkCount: chunksWithEmbeddings.length
    });

    return processedDocument;

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logger.error('Document processing failed', error, {
      documentId,
      processingTime,
      fileName: document?.fileName
    });

    // Update document status to failed
    if (document) {
      try {
        const repositories = await getRepositories();
        await repositories.documents.update(documentId, {
          ...document,
          status: 'failed',
          processingFailedAt: new Date().toISOString(),
          processingTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } catch (updateError) {
        logger.error('Failed to update document status to failed', updateError, { documentId });
      }
    }

    // Send error notification to user
    if (document?.userId) {
      try {
        await notificationService.sendInApp(
          document.userId,
          'Document Processing Failed',
          `Failed to process your document "${document.fileName}". Please try again or contact support.`
        );
      } catch (notificationError) {
        logger.warn('Failed to send error notification', { error: notificationError, documentId });
      }
    }

    throw error;
  }
}

/**
 * Chunk text into smaller pieces for embedding
 */
async function chunkText(
  text: string,
  metadata: {
    documentId: string;
    fileType: string;
    fileName: string;
    companyId: string;
    userId: string;
  }
): Promise<Omit<DocumentChunk, 'embedding'>[]> {
  const chunks: Omit<DocumentChunk, 'embedding'>[] = [];
  const chunkSize = 1000; // Characters per chunk
  const overlap = 200; // Overlap between chunks

  let startChar = 0;
  let chunkIndex = 0;

  while (startChar < text.length) {
    const endChar = Math.min(startChar + chunkSize, text.length);
    let chunkText = text.slice(startChar, endChar);

    // Try to break at sentence boundaries
    if (endChar < text.length) {
      const lastSentenceEnd = chunkText.lastIndexOf('.');
      const lastQuestionEnd = chunkText.lastIndexOf('?');
      const lastExclamationEnd = chunkText.lastIndexOf('!');
      
      const lastBreak = Math.max(lastSentenceEnd, lastQuestionEnd, lastExclamationEnd);
      
      if (lastBreak > chunkSize * 0.5) { // Only break if we're not losing too much content
        chunkText = chunkText.slice(0, lastBreak + 1);
        endChar = startChar + lastBreak + 1;
      }
    }

    // Clean up the chunk text
    chunkText = chunkText.trim();

    if (chunkText.length > 0) {
      chunks.push({
        id: `chunk_${metadata.documentId}_${chunkIndex}`,
        documentId: metadata.documentId,
        content: chunkText,
        metadata: {
          chunkIndex,
          totalChunks: 0, // Will be updated after all chunks are created
          startChar,
          endChar: endChar - 1,
          fileType: metadata.fileType,
          fileName: metadata.fileName,
          companyId: metadata.companyId,
          userId: metadata.userId
        },
        createdAt: new Date().toISOString()
      });

      chunkIndex++;
    }

    // Move start position with overlap
    startChar = endChar - overlap;
    if (startChar >= text.length) break;
  }

  // Update total chunks count
  chunks.forEach(chunk => {
    chunk.metadata.totalChunks = chunks.length;
  });

  return chunks;
}

/**
 * Generate embeddings for document chunks
 */
async function generateChunkEmbeddings(
  chunks: Omit<DocumentChunk, 'embedding'>[]
): Promise<DocumentChunk[]> {
  const chunksWithEmbeddings: DocumentChunk[] = [];

  // Process chunks in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    
    try {
      // Generate embeddings for the batch
      const embeddings = await azureOpenAIService.generateEmbeddings(
        batch.map(chunk => chunk.content)
      );

      // Combine chunks with their embeddings
      for (let j = 0; j < batch.length; j++) {
        chunksWithEmbeddings.push({
          ...batch[j],
          embedding: embeddings[j] || []
        });
      }

      logger.info('Generated embeddings for batch', {
        batchStart: i,
        batchSize: batch.length,
        totalChunks: chunks.length
      });

    } catch (error) {
      logger.error('Failed to generate embeddings for batch', error, {
        batchStart: i,
        batchSize: batch.length
      });
      
      // Add chunks without embeddings (they can be processed later)
      for (const chunk of batch) {
        chunksWithEmbeddings.push({
          ...chunk,
          embedding: []
        });
      }
    }
  }

  return chunksWithEmbeddings;
}

/**
 * Search documents using vector similarity
 */
export async function searchDocuments(
  query: string,
  companyId: string,
  limit: number = 10
): Promise<DocumentChunk[]> {
  try {
    logger.info('Starting document search', { query, companyId, limit });

    // Generate embedding for the search query
    const queryEmbedding = await azureOpenAIService.generateEmbeddings([query]);
    
    if (!queryEmbedding[0]) {
      throw new Error('Failed to generate query embedding');
    }

    // Search for similar chunks in Cosmos DB
    const repositories = await getRepositories();
    const chunks = await repositories.documentChunks.query(
      'SELECT * FROM c WHERE c.metadata.companyId = @companyId',
      [{ name: 'companyId', value: companyId }]
    );

    // Calculate cosine similarity for each chunk
    const chunksWithSimilarity = chunks.resources.map((chunk: any) => {
      const similarity = calculateCosineSimilarity(queryEmbedding[0], chunk.embedding);
      return {
        ...chunk,
        similarity
      };
    });

    // Sort by similarity and return top results
    const sortedChunks = chunksWithSimilarity
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(({ similarity, ...chunk }) => chunk); // Remove similarity score from result

    logger.info('Document search completed', {
      query,
      companyId,
      resultsCount: sortedChunks.length
    });

    return sortedChunks;

  } catch (error) {
    logger.error('Document search failed', error, { query, companyId });
    throw error;
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Delete a document and all its chunks
 */
export async function deleteDocument(documentId: string): Promise<void> {
  try {
    logger.info('Starting document deletion', { documentId });

    const repositories = await getRepositories();

    // Delete all chunks for this document
    const chunks = await repositories.documentChunks.query(
      'SELECT * FROM c WHERE c.documentId = @documentId',
      [{ name: 'documentId', value: documentId }]
    );

    for (const chunk of chunks.resources) {
      await repositories.documentChunks.delete(chunk.id);
    }

    // Delete the document
    await repositories.documents.delete(documentId);

    logger.info('Document deletion completed', {
      documentId,
      deletedChunks: chunks.resources.length
    });

  } catch (error) {
    logger.error('Document deletion failed', error, { documentId });
    throw error;
  }
}