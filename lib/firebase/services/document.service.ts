import { adminDb, FieldValue as AdminFieldValue } from '@/lib/firebase/admin';
import { z } from 'zod';
import type { FieldValue } from 'firebase-admin/firestore';

// Document schema
export const documentSchema = z.object({
  title: z.string().min(1).max(255),
  documentType: z.enum(['policy', 'guide', 'faq', 'form', 'other']),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  fileUrl: z.string().url(),
  fileType: z.string(),
  isPublic: z.boolean().default(false),
});

export type Document = z.infer<typeof documentSchema> & {
  id: string;
  companyId: string;
  createdAt: FieldValue | Date;
  updatedAt: FieldValue | Date;
  createdBy: string;
  processedAt?: FieldValue | Date;
  status: 'pending_processing' | 'processed' | 'error';
};

/**
 * Service for managing document data in Firebase
 */
export class DocumentService {
  /**
   * Create a new document
   */
  async createDocument(
    companyId: string,
    documentData: z.infer<typeof documentSchema>,
    createdBy: string
  ): Promise<string> {
    try {
      const validated = documentSchema.parse(documentData);
      
      const documentRef = adminDb.collection('companies').doc(companyId).collection('documents').doc();
      const documentId = documentRef.id;

      await documentRef.set({
        id: documentId,
        companyId,
        ...validated,
        createdBy,
        status: 'pending_processing',
        createdAt: AdminFieldValue.serverTimestamp(),
        updatedAt: AdminFieldValue.serverTimestamp()
      });

      return documentId;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Invalid document data:', error.errors);
        throw new Error('Invalid document data format');
      }
      console.error('Failed to create document:', error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(companyId: string, documentId: string): Promise<Document | null> {
    try {
      const documentDoc = await adminDb.collection('companies').doc(companyId).collection('documents').doc(documentId).get();
      
      if (!documentDoc.exists) {
        return null;
      }

      return documentDoc.data() as Document;
    } catch (error) {
      console.error(`Failed to get document ${documentId}:`, error);
      throw error;
    }
  }

  /**
   * List documents for a company
   */
  async listDocuments(companyId: string): Promise<Document[]> {
    try {
      const snapshot = await adminDb.collection('companies').doc(companyId).collection('documents').get();
      return snapshot.docs.map(doc => doc.data() as Document);
    } catch (error) {
      console.error(`Failed to list documents for company ${companyId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const documentService = new DocumentService();