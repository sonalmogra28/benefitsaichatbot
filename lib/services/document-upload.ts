import { logger } from '@/lib/logger';
import { cosmosClient } from '@/lib/azure/cosmos';

export interface UploadResult {
  id: string;
  url: string;
  filename: string;
  size: number;
  contentType: string;
}

class DocumentUploadService {
  private container = cosmosClient.database('BenefitsDB').container('documents');

  async uploadDocument(
    file: File,
    companyId: string,
    metadata: Record<string, any> = {}
  ): Promise<UploadResult> {
    try {
      const documentId = crypto.randomUUID();
      const filename = file.name;
      const contentType = file.type;
      const size = file.size;

      // Create document record
      const documentRecord = {
        id: documentId,
        companyId,
        filename,
        contentType,
        size,
        status: 'uploaded',
        uploadedAt: new Date().toISOString(),
        ...metadata
      };

      await this.container.items.create(documentRecord);

      logger.info('Document uploaded successfully', {
        documentId,
        filename,
        companyId,
        size
      });

      return {
        id: documentId,
        url: `/api/documents/${documentId}`,
        filename,
        size,
        contentType
      };

    } catch (error) {
      logger.error('Document upload failed', { error, filename: file.name, companyId });
      throw error;
    }
  }

  async getDocument(documentId: string): Promise<any> {
    try {
      const { resource } = await this.container.item(documentId).read();
      return resource;
    } catch (error) {
      if ((error as any).code === 404) {
        return null;
      }
      logger.error('Failed to get document', { error, documentId });
      throw error;
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      await this.container.item(documentId).delete();
      logger.info('Document deleted', { documentId });
    } catch (error) {
      logger.error('Failed to delete document', { error, documentId });
      throw error;
    }
  }
}

export const documentUploadService = new DocumentUploadService();
