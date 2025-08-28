import { adminDb } from '@/lib/firebase/admin';

/**
 * Service for super admin operations
 */
export class SuperAdminService {
  /**
   * Get platform statistics
   */
  async getPlatformStats() {
    const companiesSnapshot = await adminDb.collection('companies').get();
    const usersSnapshot = await adminDb.collection('users').get();
    
    // This is a simplified version. In a real application, you would need to
    // query for benefit plans and enrollments across all companies and users.
    // This is not efficient with Firestore and would require a different data model.
    const benefitPlansCount = 0;
    const activeEnrollmentsCount = 0;

    const recentCompanies = companiesSnapshot.docs
      .map(doc => doc.data())
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
      .slice(0, 5);

    return {
      totalCompanies: companiesSnapshot.size,
      totalUsers: usersSnapshot.size,
      totalPlans: benefitPlansCount,
      activeEnrollments: activeEnrollmentsCount,
      recentCompanies,
    };
  }
}

// Export singleton instance
export const superAdminService = new SuperAdminService();