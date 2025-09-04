import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { z } from 'zod';

// Benefit plan schema
export const benefitPlanSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum([
    'health',
    'dental',
    'vision',
    'life',
    'disability',
    '401k',
    'fsa',
    'hsa',
    'other',
  ]),
  provider: z.string(),
  description: z.string().optional(),
  coverage: z
    .object({
      individual: z.number().optional(),
      family: z.number().optional(),
      deductible: z.number().optional(),
      outOfPocketMax: z.number().optional(),
    })
    .optional(),
  costs: z.object({
    employeeMonthly: z.number(),
    employerMonthly: z.number(),
    totalAnnual: z.number().optional(),
  }),
  eligibility: z
    .object({
      waitingPeriod: z.number().default(0), // days
      minimumHours: z.number().default(0), // weekly hours
      employeeTypes: z.array(z.string()).default(['full-time']),
    })
    .optional(),
  enrollmentPeriod: z
    .object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    })
    .optional(),
  documents: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().url(),
        uploadedAt: z.string().datetime(),
      }),
    )
    .optional(),
});

export type BenefitPlan = z.infer<typeof benefitPlanSchema> & {
  id: string;
  companyId: string;
  createdAt: any;
  updatedAt: any;
  createdBy: string;
  status: 'active' | 'inactive' | 'archived';
  enrolledCount?: number;
};

// Enrollment schema
export const enrollmentSchema = z.object({
  userId: z.string(),
  planId: z.string(),
  companyId: z.string(),
  coverageLevel: z.enum([
    'individual',
    'family',
    'employee_spouse',
    'employee_children',
  ]),
  effectiveDate: z.string().datetime(),
  terminationDate: z.string().datetime().optional(),
  dependents: z
    .array(
      z.object({
        name: z.string(),
        relationship: z.enum(['spouse', 'child', 'domestic_partner', 'other']),
        dateOfBirth: z.string().datetime(),
        ssn: z.string().optional(), // Should be encrypted
      }),
    )
    .optional(),
  selections: z.record(z.any()).optional(),
  status: z
    .enum(['pending', 'active', 'terminated', 'cancelled'])
    .default('pending'),
});

export type Enrollment = z.infer<typeof enrollmentSchema> & {
  id: string;
  createdAt: any;
  updatedAt: any;
  monthlyPremium: number;
};

/**
 * Service for managing benefits and enrollments in Firebase
 */
export class BenefitsService {
  /**
   * Create a new benefit plan for a company
   */
  async createBenefitPlan(
    companyId: string,
    planData: z.infer<typeof benefitPlanSchema>,
    createdBy: string,
  ): Promise<string> {
    try {
      const validated = benefitPlanSchema.parse(planData);

      const planRef = adminDb
        .collection('companies')
        .doc(companyId)
        .collection('benefitPlans')
        .doc();

      const planId = planRef.id;

      await planRef.set({
        id: planId,
        companyId,
        ...validated,
        createdBy,
        status: 'active',
        enrolledCount: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return planId;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Invalid benefit plan data:', error.errors);
        throw new Error('Invalid benefit plan data format');
      }
      console.error('Failed to create benefit plan:', error);
      throw error;
    }
  }

  /**
   * Get benefit plan by ID
   */
  async getBenefitPlan(
    companyId: string,
    planId: string,
  ): Promise<BenefitPlan | null> {
    try {
      const planDoc = await adminDb
        .collection('companies')
        .doc(companyId)
        .collection('benefitPlans')
        .doc(planId)
        .get();

      if (!planDoc.exists) {
        return null;
      }

      return planDoc.data() as BenefitPlan;
    } catch (error) {
      console.error(`Failed to get benefit plan ${planId}:`, error);
      throw error;
    }
  }

  /**
   * List benefit plans for a company
   */
  async listBenefitPlans(
    companyId: string,
    options?: {
      type?: string;
      status?: 'active' | 'inactive' | 'archived';
      limit?: number;
    },
  ): Promise<BenefitPlan[]> {
    try {
      let query = adminDb
        .collection('companies')
        .doc(companyId)
        .collection('benefitPlans');

      if (options?.type) {
        query = query.where('type', '==', options.type) as any;
      }

      if (options?.status) {
        query = query.where('status', '==', options.status) as any;
      }

      if (options?.limit) {
        query = query.limit(options.limit) as any;
      }

      const snapshot = await query.get();
      return snapshot.docs
        .filter((doc) => doc.id !== '_init')
        .map((doc) => doc.data() as BenefitPlan);
    } catch (error) {
      console.error(
        `Failed to list benefit plans for company ${companyId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update benefit plan
   */
  async updateBenefitPlan(
    companyId: string,
    planId: string,
    updates: Partial<z.infer<typeof benefitPlanSchema>>,
  ): Promise<void> {
    try {
      const validated = benefitPlanSchema.partial().parse(updates);

      await adminDb
        .collection('companies')
        .doc(companyId)
        .collection('benefitPlans')
        .doc(planId)
        .update({
          ...validated,
          updatedAt: FieldValue.serverTimestamp(),
        });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Invalid update data:', error.errors);
        throw new Error('Invalid update data format');
      }
      console.error(`Failed to update benefit plan ${planId}:`, error);
      throw error;
    }
  }

  /**
   * Create an enrollment
   */
  async createEnrollment(
    enrollmentData: z.infer<typeof enrollmentSchema>,
  ): Promise<string> {
    try {
      const validated = enrollmentSchema.parse(enrollmentData);

      // Verify plan exists
      const plan = await this.getBenefitPlan(
        validated.companyId,
        validated.planId,
      );
      if (!plan) {
        throw new Error(`Benefit plan ${validated.planId} not found`);
      }

      // Calculate monthly premium based on coverage level
      const monthlyPremium = this.calculateMonthlyPremium(
        plan,
        validated.coverageLevel,
      );

      const enrollmentRef = adminDb.collection('enrollments').doc();
      const enrollmentId = enrollmentRef.id;

      await enrollmentRef.set({
        id: enrollmentId,
        ...validated,
        monthlyPremium,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Update enrolled count on the plan
      await adminDb
        .collection('companies')
        .doc(validated.companyId)
        .collection('benefitPlans')
        .doc(validated.planId)
        .update({
          enrolledCount: FieldValue.increment(1),
        });

      // Add enrollment to user's subcollection
      await adminDb
        .collection('users')
        .doc(validated.userId)
        .collection('enrollments')
        .doc(enrollmentId)
        .set({
          enrollmentId,
          planId: validated.planId,
          companyId: validated.companyId,
          status: validated.status,
          effectiveDate: validated.effectiveDate,
        });

      return enrollmentId;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Invalid enrollment data:', error.errors);
        throw new Error('Invalid enrollment data format');
      }
      console.error('Failed to create enrollment:', error);
      throw error;
    }
  }

  /**
   * Calculate monthly premium based on coverage level
   */
  private calculateMonthlyPremium(
    plan: BenefitPlan,
    coverageLevel: string,
  ): number {
    const basePremium = plan.costs.employeeMonthly;

    switch (coverageLevel) {
      case 'family':
        return basePremium * 2.5; // Family typically costs 2.5x individual
      case 'employee_spouse':
        return basePremium * 1.8;
      case 'employee_children':
        return basePremium * 1.5;
      default:
        return basePremium;
    }
  }

  /**
   * Get user enrollments
   */
  async getUserEnrollments(userId: string): Promise<Enrollment[]> {
    try {
      const snapshot = await adminDb
        .collection('enrollments')
        .where('userId', '==', userId)
        .where('status', 'in', ['active', 'pending'])
        .get();

      return snapshot.docs.map((doc) => doc.data() as Enrollment);
    } catch (error) {
      console.error(`Failed to get enrollments for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Update enrollment status
   */
  async updateEnrollmentStatus(
    enrollmentId: string,
    status: 'pending' | 'active' | 'terminated' | 'cancelled',
  ): Promise<void> {
    try {
      const enrollmentRef = adminDb.collection('enrollments').doc(enrollmentId);
      const enrollmentDoc = await enrollmentRef.get();

      if (!enrollmentDoc.exists) {
        throw new Error(`Enrollment ${enrollmentId} not found`);
      }

      const enrollment = enrollmentDoc.data() as Enrollment;

      await enrollmentRef.update({
        status,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Update user's enrollment subcollection
      await adminDb
        .collection('users')
        .doc(enrollment.userId)
        .collection('enrollments')
        .doc(enrollmentId)
        .update({ status });

      // Update enrolled count if cancelling
      if (status === 'cancelled' || status === 'terminated') {
        await adminDb
          .collection('companies')
          .doc(enrollment.companyId)
          .collection('benefitPlans')
          .doc(enrollment.planId)
          .update({
            enrolledCount: FieldValue.increment(-1),
          });
      }
    } catch (error) {
      console.error(
        `Failed to update enrollment ${enrollmentId} status:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Compare benefit plans
   */
  async comparePlans(
    companyId: string,
    planIds: string[],
  ): Promise<{
    plans: BenefitPlan[];
    comparison: {
      lowestCost: string;
      bestCoverage: string;
      mostPopular: string;
    };
  }> {
    try {
      const plans = await Promise.all(
        planIds.map((id) => this.getBenefitPlan(companyId, id)),
      );

      const validPlans = plans.filter((p) => p !== null) as BenefitPlan[];

      if (validPlans.length === 0) {
        throw new Error('No valid plans found for comparison');
      }

      // Find plan with lowest employee cost
      const lowestCost = validPlans.reduce((prev, current) =>
        prev.costs.employeeMonthly < current.costs.employeeMonthly
          ? prev
          : current,
      );

      // Find plan with best coverage (lowest deductible)
      const bestCoverage = validPlans.reduce((prev, current) => {
        const prevDeductible =
          prev.coverage?.deductible || Number.POSITIVE_INFINITY;
        const currentDeductible =
          current.coverage?.deductible || Number.POSITIVE_INFINITY;
        return prevDeductible < currentDeductible ? prev : current;
      });

      // Find most popular (highest enrollment)
      const mostPopular = validPlans.reduce((prev, current) =>
        (prev.enrolledCount || 0) > (current.enrolledCount || 0)
          ? prev
          : current,
      );

      return {
        plans: validPlans,
        comparison: {
          lowestCost: lowestCost.id,
          bestCoverage: bestCoverage.id,
          mostPopular: mostPopular.id,
        },
      };
    } catch (error) {
      console.error('Failed to compare plans:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const benefitsService = new BenefitsService();
