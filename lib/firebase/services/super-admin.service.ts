import { adminDb } from '@/lib/firebase/admin';
import type { User } from '@/lib/db/schema';
import type { SuperAdminStats } from '@/types/api';

/**
 * Service for super admin operations in a single-tenant environment
 */
export class SuperAdminService {
  /**
   * Get platform-wide statistics for the single-tenant application
   */
  async getPlatformStats(): Promise<SuperAdminStats> {
    const usersSnapshot = await adminDb.collection('users').get();
    const documentsSnapshot = await adminDb.collection('documents').get();
    const benefitPlansSnapshot = await adminDb.collection('benefitPlans').get();

    let activeEnrollmentsCount = 0;
    usersSnapshot.forEach((doc) => {
      const user = doc.data() as User;
      if (
        user.benefitsSelections &&
        Object.keys(user.benefitsSelections).length > 0
      ) {
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
