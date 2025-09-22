import { getRepositories } from '@/lib/azure/cosmos';
import { getStorageServices } from '@/lib/azure/storage';
import { pdfProcessor } from '@/lib/document-processing/pdf-processor';
import { logger } from '@/lib/logging/logger';
import { v4 as uuidv4 } from 'uuid';

export interface DocumentProcessingJob {
  id: string;
  documentId: string;
  companyId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: {
    text: string;
    metadata: any;
    chunks?: DocumentChunk[];
  };
}

export interface DocumentChunk {
  id: string;
  content: string;
  documentId: string;
  chunkIndex: number;
  embedding?: number[];
  metadata?: any;
}

export class DocumentProcessingService {
  private documentRepository: any;
  private documentChunksRepository: any;

  constructor() {
    this.initializeRepositories();
  }

  private async initializeRepositories() {
    const repositories = await getRepositories();
    this.documentRepository = repositories.documents;
    this.documentChunksRepository = repositories.documentChunks;
  }

  async processDocument(documentId: string, companyId: string): Promise<void> {
    try {
      logger.info('Starting document processing', { documentId, companyId });

      // Update document status to processing
      await this.updateDocumentStatus(documentId, companyId, 'processing');

      // Get document from database
      const document = await this.documentRepository.getById(documentId, companyId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Download file from storage
      const storageServices = await getStorageServices();
      const fileBuffer = await storageServices.documents.downloadFile(document.storagePath);

      // Process the document based on file type
      let processingResult;
      if (document.fileType === 'application/pdf') {
        processingResult = await pdfProcessor.processPDF(
          fileBuffer,
          document.fileName,
          companyId,
          document.uploadedBy
        );
      } else if (document.fileType === 'text/plain') {
        processingResult = await this.processTextFile(fileBuffer, document.fileName);
      } else {
        throw new Error(`Unsupported file type: ${document.fileType}`);
      }

      // Create document chunks for RAG
      const chunks = await this.createDocumentChunks(
        documentId,
        processingResult.text,
        processingResult.metadata
      );

      // Update document with processing results
      await this.documentRepository.update(documentId, {
        status: 'processed',
        content: processingResult.text,
        processing: {
          startedAt: new Date(),
          completedAt: new Date(),
          chunks: chunks.map(chunk => ({
            id: chunk.id,
            content: chunk.content,
            chunkIndex: chunk.chunkIndex
          }))
        },
        updatedAt: new Date()
      }, companyId);

      // Store chunks in database
      await this.storeDocumentChunks(chunks, companyId);

      logger.info('Document processing completed successfully', {
        documentId,
        companyId,
        chunksCount: chunks.length
      });

    } catch (error) {
      logger.error('Document processing failed', {
        documentId,
        companyId,
        error: error instanceof Error ? error.message : String(error)
      });

      // Update document status to failed
      await this.updateDocumentStatus(documentId, companyId, 'failed', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async processTextFile(fileBuffer: Buffer, filename: string): Promise<{
    text: string;
    metadata: any;
  }> {
    const text = fileBuffer.toString('utf-8');
    
    return {
      text,
      metadata: {
        title: filename.replace(/\.txt$/i, ''),
        author: 'Unknown',
        pages: Math.ceil(text.length / 2000), // Rough page estimation
        language: 'en',
        category: 'benefits'
      }
    };
  }

  private async storeDocumentChunks(chunks: DocumentChunk[], companyId: string): Promise<void> {
    try {
      await this.initializeRepositories();
      
      for (const chunk of chunks) {
        const chunkData = {
          ...chunk,
          id: chunk.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          companyId
        };
        
        await this.documentChunksRepository.create(chunkData);
      }
      
      logger.info('Document chunks stored successfully', {
        chunksCount: chunks.length,
        companyId
      });
    } catch (error) {
      logger.error('Failed to store document chunks', {
        chunksCount: chunks.length,
        companyId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async createDocumentChunks(
    documentId: string,
    text: string,
    metadata: any
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = [];
    const chunkSize = 1000; // Characters per chunk
    const overlap = 200; // Overlap between chunks

    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + chunkSize, text.length);
      const chunkText = text.slice(startIndex, endIndex);

      // Try to break at sentence boundaries
      const lastSentenceEnd = chunkText.lastIndexOf('.');
      const lastQuestionEnd = chunkText.lastIndexOf('?');
      const lastExclamationEnd = chunkText.lastIndexOf('!');
      
      const lastBreak = Math.max(lastSentenceEnd, lastQuestionEnd, lastExclamationEnd);
      
      let finalEndIndex = endIndex;
      if (lastBreak > chunkSize * 0.5) { // Only break if we're not too far from the end
        finalEndIndex = startIndex + lastBreak + 1;
      }

      const finalChunkText = text.slice(startIndex, finalEndIndex).trim();

      if (finalChunkText.length > 0) {
        chunks.push({
          id: `chunk_${documentId}_${chunkIndex}`,
          content: finalChunkText,
          documentId,
          chunkIndex,
          metadata: {
            ...metadata,
            startIndex,
            endIndex: finalEndIndex
          }
        });
      }

      startIndex = finalEndIndex - overlap;
      chunkIndex++;
    }

    return chunks;
  }

  private async updateDocumentStatus(
    documentId: string,
    companyId: string,
    status: 'processing' | 'completed' | 'failed',
    error?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (status === 'processing') {
      updateData.processing = {
        startedAt: new Date()
      };
    } else if (status === 'completed') {
      updateData.processing = {
        completedAt: new Date()
      };
    } else if (status === 'failed') {
      updateData.processing = {
        error: error || 'Unknown error'
      };
    }

    await this.documentRepository.update(documentId, updateData, companyId);
  }

  async triggerDocumentProcessing(documentId: string, companyId: string): Promise<void> {
    try {
      // In a production environment, this would typically:
      // 1. Add the job to a queue (Azure Service Bus, Redis, etc.)
      // 2. Use Azure Functions or background workers
      // 3. Handle retries and error recovery
      
      // For now, we'll process synchronously
      // In production, this should be async
      setImmediate(async () => {
        try {
          await this.processDocument(documentId, companyId);
        } catch (error) {
          logger.error('Background document processing failed', {
            documentId,
            companyId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      });

      logger.info('Document processing triggered', { documentId, companyId });
    } catch (error) {
      logger.error('Failed to trigger document processing', {
        documentId,
        companyId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async getProcessingStatus(documentId: string, companyId: string): Promise<{
    status: string;
    progress?: number;
    error?: string;
  }> {
    try {
      const document = await this.documentRepository.getById(documentId, companyId);
      if (!document) {
        throw new Error('Document not found');
      }

      return {
        status: document.status,
        error: document.processing?.error
      };
    } catch (error) {
      logger.error('Failed to get processing status', {
        documentId,
        companyId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

// Export singleton instance
export const documentProcessingService = new DocumentProcessingService();
