import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  DocumentData,
  FieldValue
} from 'firebase/firestore';
import { db as clientDb } from '@/lib/firebase';
import { z } from 'zod';
import type { UserRole } from '@/lib/types';

// User metadata schema
export const userMetadataSchema = z.object({
  companyId: z.string().optional(),
  department: z.string().max(100).optional(),
  hireDate: z.string().datetime().optional(),
  userType: z.enum(['employee', 'hr_admin', 'company_admin', 'platform_admin', 'super_admin']).optional(),
  location: z.string().max(200).optional(),
  benefitsSelections: z.record(z.any()).optional()
});

export type UserMetadata = z.infer<typeof userMetadataSchema>;

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  companyId?: string;
  department?: string;
  hireDate?: string;
  role: UserRole;
  createdAt: FieldValue | Date;
  updatedAt: FieldValue | Date;
  metadata?: UserMetadata;
}

/**
 * Service for managing user data in Firebase
 */
export class UserService {
  /**
   * Create or update a user in Firestore
   */
  async syncUserToFirestore(
    uid: string,
    userData: Partial<FirebaseUser>
  ): Promise<void> {
    try {
      const userRef = adminDb.collection('users').doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        // Create new user
        await userRef.set({
          uid,
          email: userData.email || '',
          displayName: userData.displayName || '',
          photoURL: userData.photoURL || null,
          companyId: userData.companyId || null,
          department: userData.department || null,
          role: userData.role || 'employee',
          createdAt: adminDb.FieldValue.serverTimestamp(),
          updatedAt: adminDb.FieldValue.serverTimestamp(),
          metadata: userData.metadata || {}
        });
      } else {
        // Update existing user
        const updateData: Partial<FirebaseUser> = {
          ...userData,
          updatedAt: adminDb.FieldValue.serverTimestamp()
        };
        await userRef.update(updateData as {[key: string]: any});
      }
    } catch (error) {
      console.error(`Failed to sync user ${uid} to Firestore:`, error);
      throw error;
    }
  }

  /**
   * Get user data from Firestore
   */
  async getUserFromFirestore(uid: string): Promise<FirebaseUser | null> {
    try {
      const userDoc = await adminDb.collection('users').doc(uid).get();
      
      if (!userDoc.exists) {
        return null;
      }

      return userDoc.data() as FirebaseUser;
    } catch (error) {
      console.error(`Failed to get user ${uid} from Firestore:`, error);
      throw error;
    }
  }

  /**
   * Update user role and set custom claims
   */
  async updateUserRole(uid: string, role: UserRole): Promise<void> {
    try {
      // Set custom claims for role-based access control
      await adminAuth.setCustomUserClaims(uid, { role });
      
      // Update role in Firestore
      await adminDb.collection('users').doc(uid).update({
        role,
        updatedAt: adminDb.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error(`Failed to update role for user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Assign user to a company
   */
  async assignUserToCompany(uid: string, companyId: string): Promise<void> {
    try {
      // Verify company exists
      const companyDoc = await adminDb.collection('companies').doc(companyId).get();
      
      if (!companyDoc.exists) {
        throw new Error(`Company ${companyId} not found`);
      }

      // Update user with company assignment
      await adminDb.collection('users').doc(uid).update({
        companyId,
        updatedAt: adminDb.FieldValue.serverTimestamp()
      });

      // Add user to company's users subcollection
      await adminDb
        .collection('companies')
        .doc(companyId)
        .collection('users')
        .doc(uid)
        .set({
          uid,
          addedAt: adminDb.FieldValue.serverTimestamp()
        });
    } catch (error) {
      console.error(`Failed to assign user ${uid} to company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Create or update user from Google OAuth
   */
  async syncGoogleUser(googleUser: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  }): Promise<void> {
    try {
      await this.syncUserToFirestore(googleUser.uid, {
        email: googleUser.email,
        displayName: googleUser.displayName,
        photoURL: googleUser.photoURL,
        role: 'employee' // Default role for new users
      });
    } catch (error) {
      console.error('Failed to sync Google user:', error);
      throw error;
    }
  }

  /**
   * Handle user deletion
   */
  async deleteUser(uid: string): Promise<void> {
    try {
      // Get user data first
      const userData = await this.getUserFromFirestore(uid);
      
      if (userData?.companyId) {
        // Remove from company's users subcollection
        await adminDb
          .collection('companies')
          .doc(userData.companyId)
          .collection('users')
          .doc(uid)
          .delete();
      }

      // Delete user document
      await adminDb.collection('users').doc(uid).delete();
      
      // Delete user from Firebase Auth
      await adminAuth.deleteUser(uid);
    } catch (error) {
      console.error(`Failed to delete user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * List users with optional filtering
   */
  async listUsers(options?: {
    companyId?: string;
    role?: UserRole;
    limit?: number;
  }): Promise<FirebaseUser[]> {
    try {
      let query = adminDb.collection('users');

      if (options?.companyId) {
        query = query.where('companyId', '==', options.companyId) as any;
      }

      if (options?.role) {
        query = query.where('role', '==', options.role) as any;
      }

      if (options?.limit) {
        query = query.limit(options.limit) as any;
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => doc.data() as FirebaseUser);
    } catch (error) {
      console.error('Failed to list users:', error);
      throw error;
    }
  }

  /**
   * Client-side method to update user metadata
   */
  async updateUserMetadata(
    uid: string,
    metadata: UserMetadata,
    isClient: boolean = false
  ): Promise<void> {
    try {
      const validatedMetadata = userMetadataSchema.parse(metadata);
      
      if (isClient) {
        // Client-side update using client SDK
        const userRef = doc(clientDb, 'users', uid);
        await updateDoc(userRef, {
          metadata: validatedMetadata,
          updatedAt: serverTimestamp()
        });
      } else {
        // Server-side update using admin SDK
        await adminDb.collection('users').doc(uid).update({
          metadata: validatedMetadata,
          updatedAt: adminDb.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Invalid metadata format:', error.errors);
        throw new Error('Invalid metadata format');
      }
      console.error(`Failed to update metadata for user ${uid}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const userService = new UserService();