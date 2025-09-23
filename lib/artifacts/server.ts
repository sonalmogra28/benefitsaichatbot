import { codeDocumentHandler } from '@/artifacts/code/server';
import { getRepositories } from '@/lib/azure/cosmos';
import { logger } from '@/lib/logger';
import { azureOpenAIService } from '@/lib/azure/openai';
import { azureAuthService } from '@/lib/azure/auth';
import { getStorageServices } from '@/lib/azure/storage';
import { redisService } from '@/lib/azure/redis';
import { imageDocumentHandler } from '@/artifacts/image/server';
import { sheetDocumentHandler } from '@/artifacts/sheet/server';
import { textDocumentHandler } from '@/artifacts/text/server';
import type { ArtifactKind } from '@/components/artifact';
// import { adminDb } from '@/lib/azure/admin';

import type { UIMessageStreamWriter } from 'ai';

export interface SaveDocumentProps {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}

export interface Document {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
  createdAt: any;
  updatedAt: any;
}

export interface CreateDocumentCallbackProps {
  id: string;
  title: string;
  dataStream: UIMessageStreamWriter;
  userId: string;
}

export interface UpdateDocumentCallbackProps {
  document: Document;
  description: string;
  dataStream: UIMessageStreamWriter;
  userId: string;
}

export interface DocumentHandler<T = ArtifactKind> {
  kind: T;
  onCreateDocument: (args: CreateDocumentCallbackProps) => Promise<void>;
  onUpdateDocument: (args: UpdateDocumentCallbackProps) => Promise<void>;
}

export function createDocumentHandler<T extends ArtifactKind>(config: {
  kind: T;
  onCreateDocument: (params: CreateDocumentCallbackProps) => Promise<string>;
  onUpdateDocument: (params: UpdateDocumentCallbackProps) => Promise<string>;
}): DocumentHandler<T> {
  return {
    kind: config.kind,
    onCreateDocument: async (args: CreateDocumentCallbackProps) => {
      const draftContent = await config.onCreateDocument({
        id: args.id,
        title: args.title,
        dataStream: args.dataStream,
        userId: args.userId,
      });

      if (args.userId) {
        await saveDocument({
          id: args.id,
          title: args.title,
          content: draftContent,
          kind: config.kind,
          userId: args.userId,
        });
      }

      return;
    },
    onUpdateDocument: async (args: UpdateDocumentCallbackProps) => {
      const draftContent = await config.onUpdateDocument({
        document: args.document,
        description: args.description,
        dataStream: args.dataStream,
        userId: args.userId,
      });

      if (args.userId) {
        await saveDocument({
          id: args.document.id,
          title: args.document.title,
          content: draftContent,
          kind: config.kind,
          userId: args.userId,
        });
      }

      return;
    },
  };
}

/*
 * Use this array to define the document handlers for each artifact kind.
 */
export const documentHandlersByArtifactKind: Array<DocumentHandler> = [
  textDocumentHandler,
  codeDocumentHandler,
  imageDocumentHandler,
  sheetDocumentHandler,
];

export const artifactKinds = ['text', 'code', 'image', 'sheet'] as const;

// Helper function to retrieve document from Azure Cosmos DB
export async function getDocument(documentId: string, userId: string): Promise<Document | null> {
  try {
    const repositories = await getRepositories();
    const documentsRepository = repositories.documents;
    
    const document = await documentsRepository.getById(documentId);
    
    if (!document) {
      logger.warn('Document not found', { documentId, userId });
      return null;
    }
    
    // Verify user has access to the document
    if (document.userId !== userId) {
      logger.warn('User does not have access to document', { documentId, userId, documentUserId: document.userId });
      return null;
    }
    
    logger.info('Document retrieved from Cosmos DB', { documentId, title: document.title });
    return document as Document;
  } catch (error) {
    logger.error('Failed to retrieve document:', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      documentId,
      userId
    });
    return null;
  }
}

// Helper function to list documents for a user
export async function listDocuments(userId: string, limit: number = 50, offset: number = 0): Promise<Document[]> {
  try {
    const repositories = await getRepositories();
    const documentsRepository = repositories.documents;
    
    const query = `
      SELECT * FROM c 
      WHERE c.userId = @userId 
      ORDER BY c.updatedAt DESC
      OFFSET @offset LIMIT @limit
    `;
    
    const parameters = [
      { name: '@userId', value: userId },
      { name: '@offset', value: offset },
      { name: '@limit', value: limit }
    ];
    
    const result = await documentsRepository.query<Document>(query, parameters);
    
    logger.info('Documents listed successfully', {
      userId,
      limit,
      offset,
      resultCount: result.resources.length
    });
    
    return result.resources;
  } catch (error) {
    logger.error('Failed to list documents:', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      userId,
      limit,
      offset
    });
    return [];
  }
}

// Helper function to save document to Azure Cosmos DB
async function saveDocument(props: SaveDocumentProps) {
  try {
    const repositories = await getRepositories();
    const documentsRepository = repositories.documents;
    
    // Check if document already exists
    const existingDocument = await documentsRepository.getById(props.id);
    
    const documentData = {
      id: props.id,
      title: props.title,
      kind: props.kind,
      content: props.content,
      userId: props.userId,
      createdAt: existingDocument?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingDocument) {
      // Update existing document
      await documentsRepository.update(props.id, documentData, props.userId);
      logger.info('Document updated in Cosmos DB', { 
        documentId: props.id, 
        title: props.title,
        kind: props.kind 
      });
    } else {
      // Create new document
      await documentsRepository.create(documentData);
      logger.info('Document created in Cosmos DB', { 
        documentId: props.id, 
        title: props.title,
        kind: props.kind 
      });
    }

    return true;
  } catch (error) {
    logger.error('Failed to save document:', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      documentId: props.id,
      title: props.title
    });
    return false;
  }
}
