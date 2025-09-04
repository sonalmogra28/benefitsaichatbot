import { adminAuth, adminDb } from '@/lib/firebase/admin-sdk';
import { doc, updateDoc } from 'firebase/firestore';
import { db as clientDb } from '@/lib/firebase/client';
import { z } from 'zod';
import type { UserRole } from '@/lib/constants/roles';
import { FieldValue } from 'firebase-admin/firestore';

// Simplified User metadata schema
export const userMetadataSchema = z.object({
  department: z.string().max(100).optional(),
  hireDate: z.string().datetime().optional(),
  location: z.string().max(200).optional(),
  benefitsSelections: z.record(z.any()).optional(),
  onboardingProgress: z.number().min(0).max(100).optional(),
  onboardingCompleted: z.boolean().optional(),
  onboardingCompletedAt: z.string().datetime().optional(),
  lastOnboardingStep: z.string().optional(),
  benefitsInterests: z.array(z.string()).optional(),
});

export type UserMetadata = z.infer<typeof userMetadataSchema>;

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  department?: string;
  hireDate?: string;
  role: UserRole;
  createdAt: any;
  updatedAt: any;
  metadata?: UserMetadata;
}

/**
 * Service for managing user data in a single-tenant Firestore structure
 */
export class UserService {
  /**
   * Create or update a user in the top-level 'users' collection
   */
  async syncUserToFirestore(
    uid: string,
    userData: Partial<FirebaseUser>,
  ): Promise<void> {
    try {
      const userRef = adminDb.collection('users').doc(uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        await userRef.set({
          uid,
          email: userData.email || '',
          displayName: userData.displayName || '',
          photoURL: userData.photoURL || null,
          department: userData.department || null,
          role: userData.role || 'employee',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          metadata: userData.metadata || {},
        });
      } else {
        const updateData: Partial<FirebaseUser> = {
          ...userData,
          updatedAt: FieldValue.serverTimestamp(),
        };
        await userRef.update(updateData as { [key: string]: any });
      }
    } catch (error) {
      console.error(`Failed to sync user ${uid} to Firestore:`, error);
      throw error;
    }
  }

  /**
   * Get user data from the top-level 'users' collection
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
      await adminAuth.setCustomUserClaims(uid, { role });
      await adminDb.collection('users').doc(uid).update({
        role,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (error) {
      console.error(`Failed to update role for user ${uid}:`, error);
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
        role: 'employee', // Default role for new users
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
      await adminDb.collection('users').doc(uid).delete();
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
    role?: UserRole;
    limit?: number;
  }): Promise<FirebaseUser[]> {
    try {
      let query = adminDb.collection('users');

      if (options?.role) {
        query = query.where('role', '==', options.role) as any;
      }

      if (options?.limit) {
        query = query.limit(options.limit) as any;
      }

      const snapshot = await query.get();
      return snapshot.docs.map((doc) => doc.data() as FirebaseUser);
    } catch (error) {
      console.error('Failed to list users:', error);
      throw error;
    }
  }

  /**
   * Client-side method to update user metadata
   */
  async updateUserMetadata(uid: string, metadata: UserMetadata): Promise<void> {
    try {
      const validatedMetadata = userMetadataSchema.parse(metadata);

      await updateDoc(doc(clientDb, 'users', uid), {
        metadata: validatedMetadata,
        updatedAt: FieldValue.serverTimestamp(),
      });
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
