import { adminDb } from '@/lib/firebase/admin';
import { z } from 'zod';
import type { FieldValue } from 'firebase-admin/firestore';

// Company schema
export const companySchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().optional(),
  industry: z.string().optional(),
  size: z.enum(['small', 'medium', 'large', 'enterprise']).optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional()
  }).optional(),
  settings: z.object({
    enrollmentPeriodStart: z.string().datetime().optional(),
    enrollmentPeriodEnd: z.string().datetime().optional(),
    defaultBenefitsPackage: z.string().optional(),
    aiChatEnabled: z.boolean().default(true),
    documentUploadEnabled: z.boolean().default(true)
  }).optional(),
  billing: z.object({
    plan: z.enum(['starter', 'professional', 'enterprise']).default('starter'),
    status: z.enum(['active', 'suspended', 'cancelled']).default('active'),
    subscribedAt: z.string().datetime().optional(),
    trialEndsAt: z.string().datetime().optional()
  }).optional()
});

export type Company = z.infer<typeof companySchema> & {
  id: string;
  createdAt: FieldValue | Date;
  updatedAt: FieldValue | Date;
  createdBy?: string;
  status: 'active' | 'inactive' | 'suspended';
  employeeCount?: number;
};

/**
 * Service for managing company data in Firebase
 */
export class CompanyService {
  /**
   * Create a new company
   */
  async createCompany(
    companyData: z.infer<typeof companySchema>,
    createdBy: string
  ): Promise<string> {
    try {
      const validated = companySchema.parse(companyData);
      
      const companyRef = adminDb.collection('companies').doc();
      const companyId = companyRef.id;

      await companyRef.set({
        id: companyId,
        ...validated,
        createdBy,
        status: 'active',
        employeeCount: 0,
        createdAt: adminDb.FieldValue.serverTimestamp(),
        updatedAt: adminDb.FieldValue.serverTimestamp()
      });

      // Initialize subcollections
      await this.initializeCompanyCollections(companyId);

      return companyId;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Invalid company data:', error.errors);
        throw new Error('Invalid company data format');
      }
      console.error('Failed to create company:', error);
      throw error;
    }
  }

  /**
   * Initialize company subcollections
   */
  private async initializeCompanyCollections(companyId: string): Promise<void> {
    try {
      // Create initial benefit plans collection
      await adminDb
        .collection('companies')
        .doc(companyId)
        .collection('benefitPlans')
        .doc('_init')
        .set({
          initialized: true,
          createdAt: adminDb.FieldValue.serverTimestamp()
        });

      // Create initial documents collection
      await adminDb
        .collection('companies')
        .doc(companyId)
        .collection('documents')
        .doc('_init')
        .set({
          initialized: true,
          createdAt: adminDb.FieldValue.serverTimestamp()
        });

      // Initialize users subcollection (empty initially)
      await adminDb
        .collection('companies')
        .doc(companyId)
        .collection('users')
        .doc('_init')
        .set({
          initialized: true,
          createdAt: adminDb.FieldValue.serverTimestamp()
        });
    } catch (error) {
      console.error(`Failed to initialize collections for company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Get company by ID
   */
  async getCompany(companyId: string): Promise<Company | null> {
    try {
      const companyDoc = await adminDb.collection('companies').doc(companyId).get();
      
      if (!companyDoc.exists) {
        return null;
      }

      return companyDoc.data() as Company;
    } catch (error) {
      console.error(`Failed to get company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Update company data
   */
  async updateCompany(
    companyId: string,
    updates: Partial<z.infer<typeof companySchema>>
  ): Promise<void> {
    try {
      const companyDoc = await adminDb.collection('companies').doc(companyId).get();
      
      if (!companyDoc.exists) {
        throw new Error(`Company ${companyId} not found`);
      }

      const validated = companySchema.partial().parse(updates);
      
      await adminDb.collection('companies').doc(companyId).update({
        ...validated,
        updatedAt: adminDb.FieldValue.serverTimestamp()
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Invalid update data:', error.errors);
        throw new Error('Invalid update data format');
      }
      console.error(`Failed to update company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * List all companies with optional filtering
   */
  async listCompanies(options?: {
    status?: 'active' | 'inactive' | 'suspended';
    limit?: number;
    startAfter?: string;
  }): Promise<Company[]> {
    try {
      let query = adminDb.collection('companies');

      if (options?.status) {
        query = query.where('status', '==', options.status) as any;
      }

      query = query.orderBy('createdAt', 'desc') as any;

      if (options?.limit) {
        query = query.limit(options.limit) as any;
      }

      if (options?.startAfter) {
        const startDoc = await adminDb.collection('companies').doc(options.startAfter).get();
        if (startDoc.exists) {
          query = query.startAfter(startDoc) as any;
        }
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => doc.data() as Company);
    } catch (error) {
      console.error('Failed to list companies:', error);
      throw error;
    }
  }

  /**
   * Update company status
   */
  async updateCompanyStatus(
    companyId: string,
    status: 'active' | 'inactive' | 'suspended'
  ): Promise<void> {
    try {
      await adminDb.collection('companies').doc(companyId).update({
        status,
        updatedAt: adminDb.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error(`Failed to update status for company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Get company statistics
   */
  async getCompanyStats(companyId: string): Promise<{
    employeeCount: number;
    benefitPlansCount: number;
    documentsCount: number;
    activeEnrollments: number;
  }> {
    try {
      const [users, plans, documents] = await Promise.all([
        adminDb.collection('companies').doc(companyId).collection('users').get(),
        adminDb.collection('companies').doc(companyId).collection('benefitPlans').get(),
        adminDb.collection('companies').doc(companyId).collection('documents').get()
      ]);

      // Filter out init documents
      const actualUsers = users.docs.filter(doc => doc.id !== '_init');
      const actualPlans = plans.docs.filter(doc => doc.id !== '_init');
      const actualDocs = documents.docs.filter(doc => doc.id !== '_init');

      return {
        employeeCount: actualUsers.length,
        benefitPlansCount: actualPlans.length,
        documentsCount: actualDocs.length,
        activeEnrollments: 0 // TODO: Implement enrollment counting
      };
    } catch (error) {
      console.error(`Failed to get stats for company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a company and all its data
   */
  async deleteCompany(companyId: string): Promise<void> {
    try {
      // Delete all subcollections first
      const batch = adminDb.batch();

      // Delete users subcollection
      const users = await adminDb.collection('companies').doc(companyId).collection('users').get();
      users.docs.forEach(doc => batch.delete(doc.ref));

      // Delete benefitPlans subcollection
      const plans = await adminDb.collection('companies').doc(companyId).collection('benefitPlans').get();
      plans.docs.forEach(doc => batch.delete(doc.ref));

      // Delete documents subcollection
      const documents = await adminDb.collection('companies').doc(companyId).collection('documents').get();
      documents.docs.forEach(doc => batch.delete(doc.ref));

      await batch.commit();

      // Delete the company document itself
      await adminDb.collection('companies').doc(companyId).delete();
    } catch (error) {
      console.error(`Failed to delete company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a document from a company
   */
  async deleteDocument(companyId: string, documentId: string): Promise<void> {
    try {
      await adminDb.collection('companies').doc(companyId).collection('documents').doc(documentId).delete();
    } catch (error) {
      console.error(`Failed to delete document ${documentId} from company ${companyId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const companyService = new CompanyService();