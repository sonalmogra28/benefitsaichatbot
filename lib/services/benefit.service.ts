import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { BenefitPlan } from '@/lib/types/benefit-plan.type';

class BenefitService {
  private benefitPlansCollection = db.collection('benefitPlans');

  /**
   * Creates a new benefit plan in the top-level collection.
   * @param planData The data for the new benefit plan.
   * @returns The newly created benefit plan with its ID.
   */
  async createBenefitPlan(
    planData: Omit<BenefitPlan, 'id'>,
  ): Promise<BenefitPlan> {
    try {
      const docRef = this.benefitPlansCollection.doc();
      const newPlan = {
        id: docRef.id,
        ...planData,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      await docRef.set(newPlan);
      return newPlan as BenefitPlan;
    } catch (error) {
      console.error('Error creating benefit plan:', error);
      throw new Error('Failed to create benefit plan.');
    }
  }

  /**
   * Retrieves a single benefit plan by its ID.
   * @param planId The ID of the benefit plan to retrieve.
   * @returns The benefit plan object or null if not found.
   */
  async getBenefitPlan(planId: string): Promise<BenefitPlan | null> {
    try {
      const doc = await this.benefitPlansCollection.doc(planId).get();
      if (!doc.exists) {
        return null;
      }
      return { id: doc.id, ...doc.data() } as BenefitPlan;
    } catch (error) {
      console.error(`Error getting benefit plan ${planId}:`, error);
      throw new Error('Failed to retrieve benefit plan.');
    }
  }

  /**
   * Retrieves all benefit plans from the platform.
   * @returns An array of all benefit plans.
   */
  async getAllBenefitPlans(): Promise<BenefitPlan[]> {
    try {
      const snapshot = await this.benefitPlansCollection.orderBy('name').get();
      return snapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as BenefitPlan,
      );
    } catch (error) {
      console.error('Error getting all benefit plans:', error);
      throw new Error('Failed to retrieve benefit plans.');
    }
  }

  /**
   * Updates an existing benefit plan.
   * @param planId The ID of the benefit plan to update.
   * @param updates The partial data to update the plan with.
   * @returns The updated benefit plan.
   */
  async updateBenefitPlan(
    planId: string,
    updates: Partial<Omit<BenefitPlan, 'id'>>,
  ): Promise<BenefitPlan> {
    try {
      const docRef = this.benefitPlansCollection.doc(planId);
      await docRef.update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      });
      const updatedDoc = await docRef.get();
      return { id: updatedDoc.id, ...updatedDoc.data() } as BenefitPlan;
    } catch (error) {
      console.error(`Error updating benefit plan ${planId}:`, error);
      throw new Error('Failed to update benefit plan.');
    }
  }

  /**
   * Deletes a benefit plan.
   * @param planId The ID of the benefit plan to delete.
   */
  async deleteBenefitPlan(planId: string): Promise<void> {
    try {
      await this.benefitPlansCollection.doc(planId).delete();
    } catch (error) {
      console.error(`Error deleting benefit plan ${planId}:`, error);
      throw new Error('Failed to delete benefit plan.');
    }
  }
}

export const benefitService = new BenefitService();
export { BenefitService };
