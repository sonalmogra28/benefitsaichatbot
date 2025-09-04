import { adminDb, FieldValue as AdminFieldValue } from '@/lib/firebase/admin';
import { z } from 'zod';
import type { FieldValue } from 'firebase-admin/firestore';

// Simplified Document schema without companyId
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
  createdAt: FieldValue | Date;
  updatedAt: FieldValue | Date;
  createdBy: string;
  processedAt?: FieldValue | Date;
  status: 'pending_processing' | 'processed' | 'error';
};

/**
 * Service for managing document data in a multi-tenant Firestore structure
 */
export class DocumentService {
  /**
   * Get a reference to a company's documents collection
   */
  private getDocumentCollection(companyId: string) {
    return adminDb
      .collection('companies')
      .doc(companyId)
      .collection('documents');
  }

  /**
   * Create a new document in `companies/{companyId}/documents`
   */
  async createDocument(
    companyId: string,
    documentData: z.infer<typeof documentSchema>,
    createdBy: string,
  ): Promise<string> {
    try {
      const validated = documentSchema.parse(documentData);

      const documentRef = this.getDocumentCollection(companyId).doc();
      const documentId = documentRef.id;

      await documentRef.set({
        id: documentId,
        ...validated,
        createdBy,
        status: 'pending_processing',
        createdAt: AdminFieldValue.serverTimestamp(),
        updatedAt: AdminFieldValue.serverTimestamp(),
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
   * Get document by ID from `companies/{companyId}/documents`
   */
  async getDocument(
    companyId: string,
    documentId: string,
  ): Promise<Document | null> {
    try {
      const documentDoc = await this.getDocumentCollection(companyId)
        .doc(documentId)
        .get();

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
   * List all documents from `companies/{companyId}/documents`
   */
  async listDocuments(companyId: string): Promise<Document[]> {
    try {
      const snapshot = await this.getDocumentCollection(companyId).get();
      return snapshot.docs.map((doc) => doc.data() as Document);
    } catch (error) {
      console.error(
        `Failed to list documents for company ${companyId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Delete a document from `companies/{companyId}/documents`
   */
  async deleteDocument(companyId: string, documentId: string): Promise<void> {
    try {
      await this.getDocumentCollection(companyId).doc(documentId).delete();
    } catch (error) {
      console.error(`Failed to delete document ${documentId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const documentService = new DocumentService();
