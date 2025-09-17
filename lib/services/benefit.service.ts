import { getRepositories } from '@/lib/azure/cosmos';
import { logger } from '@/lib/logging/logger';
import type { BenefitPlan } from '@/lib/types/benefit-plan.type';

class BenefitService {
  private async getBenefitPlansRepository() {
    const repositories = await getRepositories();
    return repositories.benefits;
  }

  /**
   * Creates a new benefit plan in the top-level collection.
   * @param planData The data for the new benefit plan.
   * @returns The newly created benefit plan with its ID.
   */
  async createBenefitPlan(
    planData: Omit<BenefitPlan, 'id'>,
  ): Promise<BenefitPlan> {
    try {
      const repository = await this.getBenefitPlansRepository();
      const newPlan: BenefitPlan = {
        id: `benefit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...planData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await repository.create(newPlan);
      
      logger.info('Benefit plan created successfully', {
        planId: newPlan.id,
        planName: newPlan.name
      });
      
      return newPlan;
    } catch (error) {
      logger.error('Error creating benefit plan', error, { planData });
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
      const repository = await this.getBenefitPlansRepository();
      const plan = await repository.getById(planId);
      
      if (plan) {
        logger.info('Benefit plan retrieved successfully', { planId });
      } else {
        logger.warn('Benefit plan not found', { planId });
      }
      
      return plan;
    } catch (error) {
      logger.error('Error getting benefit plan', error, { planId });
      throw new Error('Failed to retrieve benefit plan.');
    }
  }

  /**
   * Retrieves all benefit plans from the platform.
   * @returns An array of all benefit plans.
   */
  async getAllBenefitPlans(): Promise<BenefitPlan[]> {
    try {
      const repository = await this.getBenefitPlansRepository();
      const plans = await repository.list();
      
      // Sort by name
      plans.sort((a, b) => a.name.localeCompare(b.name));
      
      logger.info('All benefit plans retrieved successfully', {
        planCount: plans.length
      });
      
      return plans;
    } catch (error) {
      logger.error('Error getting all benefit plans', error);
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
      const repository = await this.getBenefitPlansRepository();
      
      // Get existing plan first
      const existingPlan = await repository.getById(planId);
      if (!existingPlan) {
        throw new Error('Benefit plan not found');
      }
      
      // Update with new data
      const updatedPlan = {
        ...existingPlan,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      await repository.update(planId, updatedPlan);
      
      logger.info('Benefit plan updated successfully', {
        planId,
        planName: updatedPlan.name
      });
      
      return updatedPlan;
    } catch (error) {
      logger.error('Error updating benefit plan', error, { planId, updates });
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
