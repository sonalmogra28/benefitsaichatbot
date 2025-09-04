import { adminDb } from '@/lib/firebase/admin';
import { User } from '@/lib/db/schema';

/**
 * Service for super admin operations in a single-tenant environment
 */
export class SuperAdminService {
  /**
   * Get platform-wide statistics for the single-tenant application
   */
  async getPlatformStats() {
    // Get total number of users
    const usersSnapshot = await adminDb.collection('users').get();

    // Get total number of documents
    const documentsSnapshot = await adminDb.collection('documents').get();

    // Get total number of benefit plans (assuming a top-level collection)
    const benefitPlansSnapshot = await adminDb.collection('benefitPlans').get();
    
    // Calculate active enrollments
    let activeEnrollmentsCount = 0;
    usersSnapshot.forEach(doc => {
      const user = doc.data() as User;
      if (user.benefitsSelections && Object.keys(user.benefitsSelections).length > 0) {
        activeEnrollmentsCount++;
      }
    });

    return {
      totalUsers: usersSnapshot.size,
      totalDocuments: documentsSnapshot.size,
      totalBenefitPlans: benefitPlansSnapshot.size,
      activeEnrollments: activeEnrollmentsCount,
    };
  }
}

// Export singleton instance
export const superAdminService = new SuperAdminService();
