import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// This service was for Stack Auth integration, now replaced with Firebase Auth
// Keeping minimal functionality for migration compatibility

export interface Organization {
  id: string;
  name: string;
  domain?: string;
  slug?: string;
  metadata?: Record<string, any>;
  createdAt: any;
  updatedAt: any;
}

class StackOrgService {
  /**
   * Create an organization (company)
   */
  async createOrganization(data: {
    name: string;
    domain?: string;
    slug?: string;
    metadata?: Record<string, any>;
  }): Promise<Organization> {
    try {
      const orgRef = db.collection('organizations').doc();
      
      const organization = {
        id: orgRef.id,
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      
      await orgRef.set(organization);
      
      // Also create in companies collection for compatibility
      await db.collection('companies').doc(orgRef.id).set({
        id: orgRef.id,
        name: data.name,
        domain: data.domain,
        slug: data.slug,
        metadata: data.metadata,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      return {
        ...organization,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      console.error('Failed to create organization:', error);
      throw error;
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganization(orgId: string): Promise<Organization | null> {
    try {
      // Try organizations collection first
      let doc = await db.collection('organizations').doc(orgId).get();
      
      if (!doc.exists) {
        // Fall back to companies collection
        doc = await db.collection('companies').doc(orgId).get();
      }
      
      if (!doc.exists) {
        return null;
      }
      
      return {
        id: doc.id,
        ...doc.data(),
      } as Organization;
    } catch (error) {
      console.error('Failed to get organization:', error);
      return null;
    }
  }

  /**
   * Update organization
   */
  async updateOrganization(
    orgId: string,
    updates: Partial<Organization>
  ): Promise<boolean> {
    try {
      const updateData = {
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      };
      
      // Update both collections for compatibility
      const batch = db.batch();
      
      batch.update(db.collection('organizations').doc(orgId), updateData);
      batch.update(db.collection('companies').doc(orgId), updateData);
      
      await batch.commit();
      
      return true;
    } catch (error) {
      console.error('Failed to update organization:', error);
      return false;
    }
  }

  /**
   * Delete organization
   */
  async deleteOrganization(orgId: string): Promise<boolean> {
    try {
      const batch = db.batch();
      
      // Delete from both collections
      batch.delete(db.collection('organizations').doc(orgId));
      batch.delete(db.collection('companies').doc(orgId));
      
      // Also delete associated users
      const usersSnapshot = await db
        .collection('users')
        .where('companyId', '==', orgId)
        .get();
      
      usersSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      return true;
    } catch (error) {
      console.error('Failed to delete organization:', error);
      return false;
    }
  }

  /**
   * List organizations
   */
  async listOrganizations(limit = 100): Promise<Organization[]> {
    try {
      const snapshot = await db
        .collection('companies')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Organization));
    } catch (error) {
      console.error('Failed to list organizations:', error);
      return [];
    }
  }

  /**
   * Get organization by domain
   */
  async getOrganizationByDomain(domain: string): Promise<Organization | null> {
    try {
      const snapshot = await db
        .collection('companies')
        .where('domain', '==', domain)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as Organization;
    } catch (error) {
      console.error('Failed to get organization by domain:', error);
      return null;
    }
  }

  /**
   * Get organization users
   */
  async getOrganizationUsers(orgId: string) {
    try {
      const snapshot = await db
        .collection('users')
        .where('companyId', '==', orgId)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error('Failed to get organization users:', error);
      return [];
    }
  }

  /**
   * Add user to organization
   */
  async addUserToOrganization(
    userId: string,
    orgId: string,
    role = 'employee'
  ): Promise<boolean> {
    try {
      await db.collection('users').doc(userId).update({
        companyId: orgId,
        organizationId: orgId, // For backward compatibility
        role,
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      return true;
    } catch (error) {
      console.error('Failed to add user to organization:', error);
      return false;
    }
  }

  /**
   * Remove user from organization
   */
  async removeUserFromOrganization(userId: string): Promise<boolean> {
    try {
      await db.collection('users').doc(userId).update({
        companyId: null,
        organizationId: null,
        role: 'employee',
        updatedAt: FieldValue.serverTimestamp(),
      });
      
      return true;
    } catch (error) {
      console.error('Failed to remove user from organization:', error);
      return false;
    }
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(orgId: string) {
    try {
      const [usersSnapshot, docsSnapshot, chatsSnapshot] = await Promise.all([
        db.collection('users').where('companyId', '==', orgId).get(),
        db.collection('documents').where('companyId', '==', orgId).get(),
        db.collection('chats').where('companyId', '==', orgId).get(),
      ]);
      
      return {
        totalUsers: usersSnapshot.size,
        totalDocuments: docsSnapshot.size,
        totalChats: chatsSnapshot.size,
      };
    } catch (error) {
      console.error('Failed to get organization stats:', error);
      return {
        totalUsers: 0,
        totalDocuments: 0,
        totalChats: 0,
      };
    }
  }
}

export const stackOrgService = new StackOrgService();