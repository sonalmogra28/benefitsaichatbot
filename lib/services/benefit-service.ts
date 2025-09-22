import { logger } from '@/lib/logger';
import { cosmosClient } from '@/lib/azure/cosmos';
import { BenefitPlan, BenefitEnrollment } from '@/lib/schemas/benefits';

class BenefitService {
  private plansContainer = cosmosClient.database('BenefitsDB').container('benefit_plans');
  private enrollmentsContainer = cosmosClient.database('BenefitsDB').container('benefit_enrollments');

  async getBenefitPlans(companyId: string): Promise<BenefitPlan[]> {
    try {
      const query = 'SELECT * FROM c WHERE c.companyId = @companyId AND c.isActive = true';
      const { resources } = await this.plansContainer.items.query<BenefitPlan>({
        query,
        parameters: [{ name: '@companyId', value: companyId }]
      }).fetchAll();

      return resources;
    } catch (error) {
      logger.error('Error fetching benefit plans', { error, companyId });
      return [];
    }
  }

  async getBenefitPlan(planId: string): Promise<BenefitPlan | null> {
    try {
      const { resource } = await this.plansContainer.item(planId).read<BenefitPlan>();
      return resource || null;
    } catch (error) {
      if ((error as any).code === 404) {
        return null;
      }
      logger.error('Error fetching benefit plan', { error, planId });
      throw error;
    }
  }

  async createBenefitPlan(plan: Omit<BenefitPlan, 'id'>): Promise<BenefitPlan> {
    try {
      const newPlan: BenefitPlan = {
        ...plan,
        id: crypto.randomUUID()
      };

      const { resource } = await this.plansContainer.items.create(newPlan);
      return resource!;
    } catch (error) {
      logger.error('Error creating benefit plan', { error, plan });
      throw error;
    }
  }

  async updateBenefitPlan(planId: string, updates: Partial<BenefitPlan>): Promise<BenefitPlan> {
    try {
      const existingPlan = await this.getBenefitPlan(planId);
      if (!existingPlan) {
        throw new Error('Benefit plan not found');
      }

      const updatedPlan: BenefitPlan = {
        ...existingPlan,
        ...updates
      };

      const { resource } = await this.plansContainer.item(planId).replace(updatedPlan);
      return resource!;
    } catch (error) {
      logger.error('Error updating benefit plan', { error, planId, updates });
      throw error;
    }
  }

  async deleteBenefitPlan(planId: string): Promise<void> {
    try {
      await this.plansContainer.item(planId).delete();
    } catch (error) {
      logger.error('Error deleting benefit plan', { error, planId });
      throw error;
    }
  }

  async enrollInBenefit(enrollment: BenefitEnrollment): Promise<string> {
    try {
      const enrollmentRecord = {
        id: crypto.randomUUID(),
        ...enrollment,
        enrolledAt: new Date().toISOString(),
        status: 'active'
      };

      await this.enrollmentsContainer.items.create(enrollmentRecord);
      logger.info('Benefit enrollment created', { enrollmentId: enrollmentRecord.id, planId: enrollment.planId });
      return enrollmentRecord.id;
    } catch (error) {
      logger.error('Error enrolling in benefit', { error, enrollment });
      throw error;
    }
  }

  async getEmployeeEnrollments(employeeId: string): Promise<any[]> {
    try {
      const query = 'SELECT * FROM c WHERE c.employeeId = @employeeId';
      const { resources } = await this.enrollmentsContainer.items.query({
        query,
        parameters: [{ name: '@employeeId', value: employeeId }]
      }).fetchAll();

      return resources;
    } catch (error) {
      logger.error('Error fetching employee enrollments', { error, employeeId });
      return [];
    }
  }

  async compareBenefitPlans(planIds: string[], criteria: string[]): Promise<any> {
    try {
      const plans = await Promise.all(planIds.map(id => this.getBenefitPlan(id)));
      const validPlans = plans.filter(plan => plan !== null);

      // TODO: Implement actual comparison logic based on criteria
      return {
        plans: validPlans,
        comparison: {
          cost: validPlans.map(plan => ({ id: plan.id, monthlyCost: plan.monthlyCost })),
          coverage: validPlans.map(plan => ({ id: plan.id, coveragePercentage: plan.coveragePercentage })),
        }
      };
    } catch (error) {
      logger.error('Error comparing benefit plans', { error, planIds, criteria });
      throw error;
    }
  }
}

export const benefitService = new BenefitService();
