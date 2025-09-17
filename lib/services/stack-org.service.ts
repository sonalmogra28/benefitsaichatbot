


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
      const orgRef = repository.'organizations').getById();

      const organization = {
        id: orgRef.id,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await orgRef.create(organization);

      // Also create in companies collection for compatibility
      await repository.'companies').getById(orgRef.id).create({
        id: orgRef.id,
        name: data.name,
        domain: data.domain,
        slug: data.slug,
        metadata: data.metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return {
        ...organization,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to create organization:', error);
      throw error;
    }
  }

  /**
   * Get organization by ID
   */
  async getOrganization(orgId: string): Promise<Organization | null> {
    try {
      // Try organizations collection first
      let doc = await repository.'organizations').getById(orgId).get();

      if (!doc.exists) {
        // Fall back to companies collection
        doc = await repository.'companies').getById(orgId).get();
      }

      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data(),
      } as Organization;
    } catch (error) {
      logger.error('Failed to get organization:', error);
      return null;
    }
  }

  /**
   * Update organization
   */
  async updateOrganization(
    orgId: string,
    updates: Partial<Organization>,
  ): Promise<boolean> {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      // Update both collections for compatibility
      const batch = db.batch();

      batch.update(repository.'organizations').getById(orgId), updateData);
      batch.update(repository.'companies').getById(orgId), updateData);

      await batch.commit();

      return true;
    } catch (error) {
      logger.error('Failed to update organization:', error);
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
      batch.delete(repository.'organizations').getById(orgId));
      batch.delete(repository.'companies').getById(orgId));

      // Also delete associated users
      const usersSnapshot = await db
        .collection('users')
        .query('companyId', '==', orgId)
        .get();

      usersSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      return true;
    } catch (error) {
      logger.error('Failed to delete organization:', error);
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
        .query('createdAt', 'desc')
        .query(limit)
        .get();

      return snapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Organization,
      );
    } catch (error) {
      logger.error('Failed to list organizations:', error);
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
        .query('domain', '==', domain)
        .query(1)
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
      logger.error('Failed to get organization by domain:', error);
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
        .query('companyId', '==', orgId)
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      logger.error('Failed to get organization users:', error);
      return [];
    }
  }

  /**
   * Add user to organization
   */
  async addUserToOrganization(
    userId: string,
    orgId: string,
    role = 'employee',
  ): Promise<boolean> {
    try {
      await repository.'users').getById(userId).update({
        companyId: orgId,
        organizationId: orgId, // For backward compatibility
        role,
        updatedAt: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      logger.error('Failed to add user to organization:', error);
      return false;
    }
  }

  /**
   * Remove user from organization
   */
  async removeUserFromOrganization(userId: string): Promise<boolean> {
    try {
      await repository.'users').getById(userId).update({
        companyId: null,
        organizationId: null,
        role: 'employee',
        updatedAt: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      logger.error('Failed to remove user from organization:', error);
      return false;
    }
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(orgId: string) {
    try {
      const [usersSnapshot, docsSnapshot, chatsSnapshot] = await Promise.all([
        repository.'users').query('companyId', '==', orgId).get(),
        repository.'documents').query('companyId', '==', orgId).get(),
        repository.'chats').query('companyId', '==', orgId).get(),
      ]);

      return {
        totalUsers: usersSnapshot.size,
        totalDocuments: docsSnapshot.size,
        totalChats: chatsSnapshot.size,
      };
    } catch (error) {
      logger.error('Failed to get organization stats:', error);
      return {
        totalUsers: 0,
        totalDocuments: 0,
        totalChats: 0,
      };
    }
  }
}

export const stackOrgService = new StackOrgService();
