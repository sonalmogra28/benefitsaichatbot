import { z } from 'zod';
import { streamObject, tool } from 'ai';
import type { UIMessageStreamWriter } from 'ai';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { generateUUID } from '@/lib/utils';
import { myProvider } from '../providers';

interface RequestSuggestionsProps {
  userId: string;
  dataStream: UIMessageStreamWriter;
}

interface Suggestion {
  id: string;
  documentId: string;
  userId: string;
  originalText: string;
  suggestedText: string;
  description: string;
  createdAt: FieldValue | Date;
  isResolved: boolean;
}

export const requestSuggestions = ({
  userId,
  dataStream,
}: RequestSuggestionsProps) =>
  tool({
    description: 'Request suggestions for a document',
    inputSchema: z.object({
      documentId: z
        .string()
        .describe('The ID of the document to request edits'),
    }),
    execute: async ({ documentId }: { documentId: string }) => {
      try {
        // Get document from Firestore
        const documentRef = await adminDb.collection('documents').doc(documentId).get();
        
        if (!documentRef.exists) {
          return {
            error: 'Document not found',
          };
        }
        
        const document = documentRef.data();
        
        if (!document || !document.content) {
          return {
            error: 'Document has no content',
          };
        }

        const suggestions: Omit<Suggestion, 'createdAt'>[] = [];

        const { elementStream } = streamObject({
          model: myProvider.languageModel('artifact-model'),
          system:
            'You are a help writing assistant. Given a piece of writing, please offer suggestions to improve the piece of writing and describe the change. It is very important for the edits to contain full sentences instead of just words. Max 5 suggestions.',
          prompt: document.content,
          output: 'array',
          schema: z.object({
            originalSentence: z.string().describe('The original sentence'),
            suggestedSentence: z.string().describe('The suggested sentence'),
            description: z.string().describe('The description of the suggestion'),
          }),
        });

        for await (const element of elementStream) {
          if (element) {
            const suggestion = {
              id: generateUUID(),
              documentId,
              userId,
              originalText: element.originalSentence,
              suggestedText: element.suggestedSentence,
              description: element.description,
              isResolved: false,
            };

            suggestions.push(suggestion);
            // Write suggestion as data
            dataStream.write({
              type: 'data-suggestion',
              data: suggestion,
              transient: false,
            });
          }
        }

        // Save suggestions to Firestore
        if (suggestions.length > 0) {
          const batch = adminDb.batch();
          
          suggestions.forEach(suggestion => {
            const suggestionRef = adminDb.collection('suggestions').doc(suggestion.id);
            batch.set(suggestionRef, {
              ...suggestion,
              createdAt: FieldValue.serverTimestamp(),
            });
          });
          
          await batch.commit();
        }

        return {
          success: true,
          documentId,
          suggestions: suggestions.map(({ id, description }) => ({
            id,
            description,
          })),
        };
      } catch (error) {
        console.error('Failed to generate suggestions:', error);
        return {
          error: 'Failed to generate suggestions',
        };
      }
    },
  });

// Helper function to get document by ID
export async function getDocumentById(documentId: string) {
  try {
    const doc = await adminDb.collection('documents').doc(documentId).get();
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

// Helper function to save suggestions
export async function saveSuggestions(suggestions: Omit<Suggestion, 'createdAt'>[]) {
  try {
    const batch = adminDb.batch();
    
    suggestions.forEach(suggestion => {
      const suggestionRef = adminDb.collection('suggestions').doc(suggestion.id);
      batch.set(suggestionRef, {
        ...suggestion,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Failed to save suggestions:', error);
    return false;
  }
}