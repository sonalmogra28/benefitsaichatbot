import { tool } from 'ai';
import type { UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { documentHandlersByArtifactKind } from '@/lib/artifacts/server';

interface UpdateDocumentProps {
  userId: string;
  dataStream: UIMessageStreamWriter;
}

// Helper function to get document by ID
async function getDocumentById(id: string) {
  try {
    const doc = await db.collection('documents').doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return {
      id: doc.id,
      ...doc.data()
    };
  } catch (error) {
    console.error('Failed to get document:', error);
    return null;
  }
}

export const updateDocument = ({ userId, dataStream }: UpdateDocumentProps) =>
  tool({
    description: 'Update a document with the given description.',
    inputSchema: z.object({
      id: z.string().describe('The ID of the document to update'),
      description: z
        .string()
        .describe('The description of changes that need to be made'),
    }),
    execute: async ({ id, description }: { id: string; description: string }) => {
      const document = await getDocumentById(id);

      if (!document) {
        return {
          error: 'Document not found',
        };
      }

      dataStream.write({
        type: 'data-clear',
        data: null,
        transient: true,
      });

      const documentHandler = documentHandlersByArtifactKind.find(
        (documentHandlerByArtifactKind) =>
          documentHandlerByArtifactKind.kind === document.kind,
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${document.kind}`);
      }

      await documentHandler.onUpdateDocument({
        document,
        description,
        dataStream,
        userId,
      });

      dataStream.write({ type: 'data-finish', data: null, transient: true });

      return {
        id,
        title: document.title,
        kind: document.kind,
        content: 'The document has been updated successfully.',
      };
    },
  });
