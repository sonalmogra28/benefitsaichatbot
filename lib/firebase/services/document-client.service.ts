import { auth } from '@/lib/firebase/client';

/**
 * Client-side document service that calls API routes
 */
export class DocumentClientService {
  /**
   * Get authorization header with current user's token
   */
  private async getAuthHeader() {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    const token = await user.getIdToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * List documents for the current user's company
   */
  async listDocuments() {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch('/api/documents', {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      return data.documents || [];
    } catch (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
  }

  /**
   * Create a new document
   */
  async createDocument(documentData: any) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers,
        body: JSON.stringify(documentData),
      });

      if (!response.ok) {
        throw new Error('Failed to create document');
      }

      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }
}

// Export singleton instance for client-side use
export const documentClientService = new DocumentClientService();
