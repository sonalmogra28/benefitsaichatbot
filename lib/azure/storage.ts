import { BlobServiceClient, ContainerClient, BlobClient, BlockBlobClient } from '@azure/storage-blob';
import { azureConfig, getBlobStorageConfig } from './config';
import { logger } from '@/lib/logging/logger';

// Initialize Blob Storage client
const storageConfig = getBlobStorageConfig();
const blobServiceClient = new BlobServiceClient(storageConfig.connectionString);

let containers: {
  documents: ContainerClient;
  images: ContainerClient;
};

// Initialize containers
export const initializeBlobStorage = async () => {
  try {
    // Create containers if they don't exist
    containers = {
      documents: blobServiceClient.getContainerClient(azureConfig.storageContainerDocuments),
      images: blobServiceClient.getContainerClient(azureConfig.storageContainerImages),
    };

    // Create containers if they don't exist
    await containers.documents.createIfNotExists({
      access: 'private'
    });
    
    await containers.images.createIfNotExists({
      access: 'private'
    });

    logger.info('Blob Storage initialized successfully', {
      accountName: storageConfig.accountName,
      containers: Object.keys(containers)
    });

    return containers;
  } catch (error) {
    logger.error('Failed to initialize Blob Storage', error);
    throw error;
  }
};

// Generic blob storage service
export class BlobStorageService {
  constructor(private container: ContainerClient) {}

  async uploadFile(
    fileName: string,
    fileBuffer: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    try {
      const blockBlobClient = this.container.getBlockBlobClient(fileName);
      
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: contentType,
        },
        metadata,
      };

      await blockBlobClient.upload(fileBuffer, fileBuffer.length, uploadOptions);
      
      const url = blockBlobClient.url;
      
      logger.info('File uploaded to Blob Storage', {
        container: this.container.name,
        fileName,
        contentType,
        url,
        size: fileBuffer.length
      });

      return url;
    } catch (error) {
      logger.error('Failed to upload file to Blob Storage', error, {
        container: this.container.name,
        fileName,
        contentType
      });
      throw error;
    }
  }

  async downloadFile(fileName: string): Promise<Buffer> {
    try {
      const blobClient = this.container.getBlobClient(fileName);
      const downloadResponse = await blobClient.download();
      
      if (!downloadResponse.readableStreamBody) {
        throw new Error('No readable stream body in download response');
      }

      const chunks: Buffer[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(chunk);
      }
      
      const fileBuffer = Buffer.concat(chunks);
      
      logger.info('File downloaded from Blob Storage', {
        container: this.container.name,
        fileName,
        size: fileBuffer.length
      });

      return fileBuffer;
    } catch (error) {
      logger.error('Failed to download file from Blob Storage', error, {
        container: this.container.name,
        fileName
      });
      throw error;
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    try {
      const blobClient = this.container.getBlobClient(fileName);
      await blobClient.delete();
      
      logger.info('File deleted from Blob Storage', {
        container: this.container.name,
        fileName
      });
    } catch (error) {
      logger.error('Failed to delete file from Blob Storage', error, {
        container: this.container.name,
        fileName
      });
      throw error;
    }
  }

  getContainerClient(): ContainerClient {
    return this.container;
  }

  async getFileUrl(fileName: string, expiresInMinutes: number = 60): Promise<string> {
    try {
      const blobClient = this.container.getBlobClient(fileName);
      const expiresOn = new Date(Date.now() + expiresInMinutes * 60 * 1000);
      
      const url = await blobClient.generateSasUrl({
        permissions: 'r',
        expiresOn
      });
      
      logger.info('SAS URL generated for file', {
        container: this.container.name,
        fileName,
        expiresInMinutes
      });

      return url;
    } catch (error) {
      logger.error('Failed to generate SAS URL for file', error, {
        container: this.container.name,
        fileName
      });
      throw error;
    }
  }

  async listFiles(prefix?: string): Promise<Array<{ name: string; size: number; lastModified: Date }>> {
    try {
      const files: Array<{ name: string; size: number; lastModified: Date }> = [];
      
      for await (const blob of this.container.listBlobsFlat({ prefix })) {
        files.push({
          name: blob.name,
          size: blob.properties.contentLength || 0,
          lastModified: blob.properties.lastModified || new Date()
        });
      }
      
      logger.info('Files listed from Blob Storage', {
        container: this.container.name,
        prefix,
        count: files.length
      });

      return files;
    } catch (error) {
      logger.error('Failed to list files from Blob Storage', error, {
        container: this.container.name,
        prefix
      });
      throw error;
    }
  }

  async getFileMetadata(fileName: string): Promise<{
    contentType: string;
    size: number;
    lastModified: Date;
    metadata: Record<string, string>;
  } | null> {
    try {
      const blobClient = this.container.getBlobClient(fileName);
      const properties = await blobClient.getProperties();
      
      return {
        contentType: properties.contentType || 'application/octet-stream',
        size: properties.contentLength || 0,
        lastModified: properties.lastModified || new Date(),
        metadata: properties.metadata || {}
      };
    } catch (error) {
      if (error.statusCode === 404) {
        return null;
      }
      logger.error('Failed to get file metadata from Blob Storage', error, {
        container: this.container.name,
        fileName
      });
      throw error;
    }
  }

  async copyFile(sourceFileName: string, destFileName: string): Promise<void> {
    try {
      const sourceBlobClient = this.container.getBlobClient(sourceFileName);
      const destBlobClient = this.container.getBlobClient(destFileName);
      
      await destBlobClient.syncCopyFromURL(sourceBlobClient.url);
      
      logger.info('File copied in Blob Storage', {
        container: this.container.name,
        sourceFileName,
        destFileName
      });
    } catch (error) {
      logger.error('Failed to copy file in Blob Storage', error, {
        container: this.container.name,
        sourceFileName,
        destFileName
      });
      throw error;
    }
  }
}

// Initialize storage services
let storageServices: {
  documents: BlobStorageService;
  images: BlobStorageService;
};

export const getStorageServices = async () => {
  if (!storageServices) {
    const containers = await initializeBlobStorage();
    storageServices = {
      documents: new BlobStorageService(containers.documents),
      images: new BlobStorageService(containers.images),
    };
  }
  return storageServices;
};

// Export the client for advanced operations
export { blobServiceClient, containers };
