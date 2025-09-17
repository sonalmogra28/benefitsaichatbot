/**
 * Document Processing Service
 * Handles document upload, processing, and storage
 */

import { Document } from '@/lib/db/tenant-schema';
import { tenantService } from '@/lib/services/tenant-service';
import { pdfProcessor, PDFProcessingResult } from './pdf-processor';
import { logger } from '@/lib/logging/logger';
import { getContainer } from '@/lib/azure/cosmos-db';

export interface DocumentUploadRequest {
  file: Buffer;
  filename: string;
  mimeType: string;
  tenantId: string;
  uploadedBy: string;
  category?: string;
}

export interface DocumentProcessingStatus {
  id: string;
  status: 'processing' | 'processed' | 'error';
  progress: number;
  errorMessage?: string;
  extractedText?: string;
  metadata?: any;
}

export class DocumentService {
  private documentsContainer;

  constructor() {
    this.documentsContainer = getContainer('documents');
  }

  async uploadDocument(request: DocumentUploadRequest): Promise<Document> {
    const { file, filename, mimeType, tenantId, uploadedBy, category } = request;

    try {
      // Validate tenant access
      const hasAccess = await tenantService.validateTenantStatus(tenantId);
      if (!hasAccess) {
        throw new Error('Tenant not found or inactive');
      }

      // Create document record
      const document: Document = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        uploadedBy,
        filename: filename,
        originalName: filename,
        mimeType,
        size: file.length,
        status: 'processing',
        metadata: {
          category: category || 'benefits',
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save document record
      const result = await this.documentsContainer.items.create(document);

      // Start processing asynchronously
      this.processDocumentAsync(document.id, file, mimeType);

      logger.info('Document uploaded', {
        documentId: document.id,
        tenantId,
        filename,
        size: file.length,
      });

      return result.resource;
    } catch (error) {
      logger.error('Document upload failed', {
        tenantId,
        filename,
        error: error.message,
      });
      throw error;
    }
  }

  private async processDocumentAsync(
    documentId: string,
    file: Buffer,
    mimeType: string
  ): Promise<void> {
    try {
      // Update status to processing
      await this.updateDocumentStatus(documentId, 'processing', 0);

      let processingResult: PDFProcessingResult;

      // Process based on file type
      if (mimeType === 'application/pdf' || mimeType === 'application/x-pdf') {
        processingResult = await pdfProcessor.processPDF(file, documentId, '', '');
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      // Update document with processed data
      await this.updateDocumentStatus(documentId, 'processed', 100, {
        extractedText: processingResult.text,
        metadata: processingResult.metadata,
        processedAt: new Date().toISOString(),
      });

      logger.info('Document processed successfully', {
        documentId,
        pages: processingResult.metadata.pages,
        category: processingResult.metadata.category,
      });
    } catch (error) {
      logger.error('Document processing failed', {
        documentId,
        error: error.message,
      });

      await this.updateDocumentStatus(documentId, 'error', 0, {
        errorMessage: error.message,
      });
    }
  }

  private async updateDocumentStatus(
    documentId: string,
    status: Document['status'],
    progress: number,
    additionalData?: any
  ): Promise<void> {
    try {
      const document = await this.getDocument(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      const updates: Partial<Document> = {
        status,
        updatedAt: new Date().toISOString(),
        ...additionalData,
      };

      await this.documentsContainer.item(documentId, document.tenantId).replace({
        ...document,
        ...updates,
      });
    } catch (error) {
      logger.error('Failed to update document status', {
        documentId,
        status,
        error: error.message,
      });
    }
  }

  async getDocument(documentId: string): Promise<Document | null> {
    try {
      // First, try to find the document by querying all tenants
      // In a real implementation, you might want to optimize this
      const query = {
        query: 'SELECT * FROM c WHERE c.id = @documentId',
        parameters: [{ name: '@documentId', value: documentId }],
      };

      const result = await this.documentsContainer.items.query(query).fetchAll();
      return result.resources[0] || null;
    } catch (error) {
      logger.error('Failed to get document', { documentId, error: error.message });
      return null;
    }
  }

  async getTenantDocuments(
    tenantId: string,
    uploadedBy?: string,
    limit = 50
  ): Promise<Document[]> {
    return await tenantService.getTenantDocuments(tenantId, uploadedBy, limit);
  }

  async searchDocuments(
    tenantId: string,
    query: string,
    category?: string,
    limit = 20
  ): Promise<Document[]> {
    try {
      let searchQuery;
      if (category) {
        searchQuery = {
          query: `
            SELECT * FROM c 
            WHERE c.tenantId = @tenantId 
            AND c.status = 'processed'
            AND c.metadata.category = @category
            AND CONTAINS(c.extractedText, @query, true)
            ORDER BY c.updatedAt DESC
          `,
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@category', value: category },
            { name: '@query', value: query },
          ],
        };
      } else {
        searchQuery = {
          query: `
            SELECT * FROM c 
            WHERE c.tenantId = @tenantId 
            AND c.status = 'processed'
            AND CONTAINS(c.extractedText, @query, true)
            ORDER BY c.updatedAt DESC
          `,
          parameters: [
            { name: '@tenantId', value: tenantId },
            { name: '@query', value: query },
          ],
        };
      }

      const result = await this.documentsContainer.items.query(searchQuery).fetchAll();
      return result.resources.slice(0, limit);
    } catch (error) {
      logger.error('Document search failed', {
        tenantId,
        query,
        category,
        error: error.message,
      });
      return [];
    }
  }

  async deleteDocument(documentId: string, tenantId: string): Promise<void> {
    try {
      const document = await this.getDocument(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      if (document.tenantId !== tenantId) {
        throw new Error('Unauthorized to delete this document');
      }

      await this.documentsContainer.item(documentId, tenantId).delete();

      logger.info('Document deleted', { documentId, tenantId });
    } catch (error) {
      logger.error('Failed to delete document', {
        documentId,
        tenantId,
        error: error.message,
      });
      throw error;
    }
  }

  async getDocumentProcessingStatus(documentId: string): Promise<DocumentProcessingStatus | null> {
    try {
      const document = await this.getDocument(documentId);
      if (!document) {
        return null;
      }

      return {
        id: document.id,
        status: document.status,
        progress: document.status === 'processed' ? 100 : document.status === 'error' ? 0 : 50,
        errorMessage: document.errorMessage,
        extractedText: document.extractedText,
        metadata: document.metadata,
      };
    } catch (error) {
      logger.error('Failed to get document processing status', {
        documentId,
        error: error.message,
      });
      return null;
    }
  }
}

export const documentService = new DocumentService();
