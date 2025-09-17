import { amerivetBenefits2024_2025, getPlansByRegion, getPlanById, calculatePremium, isEligibleForPlan } from '@/lib/data/amerivet-benefits-2024-2025';
import { BenefitPlan, OpenEnrollment, EligibilityRules } from '@/lib/data/amerivet-benefits-2024-2025';
import { getRepositories } from '@/lib/azure/cosmos';
import { logger } from '@/lib/logging/logger';
import { v4 as uuidv4 } from 'uuid';

export interface BenefitsQuery {
  region?: string;
  employeeType?: 'full-time' | 'part-time';
  hoursWorked?: number;
  planType?: 'medical' | 'dental' | 'vision' | 'life' | 'disability' | 'voluntary';
  provider?: string;
}

export interface PlanComparison {
  planId: string;
  name: string;
  provider: string;
  monthlyPremium: number;
  biweeklyPremium: number;
  deductible: number;
  features: string[];
  limitations: string[];
  regionalAvailability: string[];
}

export interface PremiumCalculation {
  planId: string;
  tier: 'employeeOnly' | 'employeeSpouse' | 'employeeChildren' | 'employeeFamily';
  monthlyAmount: number;
  biweeklyAmount: number;
  annualAmount: number;
  employerContribution?: number;
  employeeContribution: number;
}

export class BenefitsService {
  private benefitsRepository: any;

  constructor() {
    this.initializeRepository();
  }

  private async initializeRepository() {
    const repositories = await getRepositories();
    this.benefitsRepository = repositories.benefits;
  }

  /**
   * Create a new benefit plan
   */
  async createBenefitPlan(planData: Omit<BenefitPlan, 'id'>, companyId: string): Promise<BenefitPlan> {
    try {
      await this.initializeRepository();
      
      const plan: BenefitPlan = {
        id: uuidv4(),
        ...planData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.benefitsRepository.create({
        ...plan,
        companyId,
        type: 'benefit_plan'
      });

      logger.info('Benefit plan created successfully', {
        planId: plan.id,
        companyId,
        planName: plan.name
      });

      return plan;
    } catch (error) {
      logger.error('Failed to create benefit plan', error, {
        companyId,
        planName: planData.name
      });
      throw error;
    }
  }

  /**
   * Update an existing benefit plan
   */
  async updateBenefitPlan(planId: string, companyId: string, updates: Partial<BenefitPlan>): Promise<BenefitPlan> {
    try {
      await this.initializeRepository();
      
      const existingPlan = await this.benefitsRepository.getById(planId, companyId);
      if (!existingPlan) {
        throw new Error('Benefit plan not found');
      }

      const updatedPlan = {
        ...existingPlan,
        ...updates,
        id: planId, // Ensure ID doesn't change
        updatedAt: new Date()
      };

      await this.benefitsRepository.update(planId, updatedPlan, companyId);

      logger.info('Benefit plan updated successfully', {
        planId,
        companyId,
        updateFields: Object.keys(updates)
      });

      return updatedPlan;
    } catch (error) {
      logger.error('Failed to update benefit plan', error, {
        planId,
        companyId,
        updates
      });
      throw error;
    }
  }

  /**
   * Delete a benefit plan
   */
  async deleteBenefitPlan(planId: string, companyId: string): Promise<void> {
    try {
      await this.initializeRepository();
      
      await this.benefitsRepository.delete(planId, companyId);

      logger.info('Benefit plan deleted successfully', {
        planId,
        companyId
      });
    } catch (error) {
      logger.error('Failed to delete benefit plan', error, {
        planId,
        companyId
      });
      throw error;
    }
  }

  /**
   * Get benefit plans for a company
   */
  async getCompanyBenefitPlans(companyId: string): Promise<BenefitPlan[]> {
    try {
      await this.initializeRepository();
      
      const query = `SELECT * FROM c WHERE c.companyId = @companyId AND c.type = 'benefit_plan' ORDER BY c.createdAt DESC`;
      const parameters = [{ name: '@companyId', value: companyId }];
      
      const { resources } = await this.benefitsRepository.query(query, parameters);

      logger.info('Company benefit plans retrieved', {
        companyId,
        planCount: resources.length
      });

      return resources;
    } catch (error) {
      logger.error('Failed to get company benefit plans', error, {
        companyId
      });
      throw error;
    }
  }

  /**
   * Get all available plans based on query criteria
   */
  async getAvailablePlans(query: BenefitsQuery = {}): Promise<BenefitPlan[]> {
    try {
      let plans = [
        ...amerivetBenefits2024_2025.medicalPlans,
        amerivetBenefits2024_2025.dentalPlan,
        amerivetBenefits2024_2025.visionPlan,
        ...amerivetBenefits2024_2025.voluntaryPlans
      ];

      // Filter by region
      if (query.region) {
        const regionalPlanIds = amerivetBenefits2024_2025.regionalPlans[query.region] || [];
        plans = plans.filter(plan => 
          plan.regionalAvailability.includes('nationwide') || 
          plan.regionalAvailability.includes(query.region!) ||
          regionalPlanIds.includes(plan.id)
        );
      }

      // Filter by plan type
      if (query.planType) {
        plans = plans.filter(plan => plan.type === query.planType);
      }

      // Filter by provider
      if (query.provider) {
        plans = plans.filter(plan => 
          plan.provider.toLowerCase().includes(query.provider!.toLowerCase())
        );
      }

      // Filter by eligibility
      if (query.employeeType && query.hoursWorked !== undefined) {
        plans = plans.filter(plan => 
          isEligibleForPlan(plan.id, query.employeeType!, query.hoursWorked!, query.region || 'nationwide')
        );
      }

      logger.info('Benefits plans retrieved', {
        query,
        planCount: plans.length
      });

      return plans;
    } catch (error) {
      logger.error('Failed to get available plans', error, { query });
      throw error;
    }
  }

  /**
   * Get plan details by ID
   */
  async getPlanDetails(planId: string): Promise<BenefitPlan | null> {
    try {
      const plan = getPlanById(planId);
      
      if (plan) {
        logger.info('Plan details retrieved', { planId, planName: plan.name });
      } else {
        logger.warn('Plan not found', { planId });
      }

      return plan || null;
    } catch (error) {
      logger.error('Failed to get plan details', error, { planId });
      throw error;
    }
  }

  /**
   * Compare multiple plans
   */
  async comparePlans(planIds: string[]): Promise<PlanComparison[]> {
    try {
      const comparisons: PlanComparison[] = [];

      for (const planId of planIds) {
        const plan = getPlanById(planId);
        if (plan) {
          comparisons.push({
            planId: plan.id,
            name: plan.name,
            provider: plan.provider,
            monthlyPremium: plan.premiums.employee.monthly,
            biweeklyPremium: plan.premiums.employee.biweekly,
            deductible: plan.benefits.deductible,
            features: plan.features,
            limitations: plan.limitations,
            regionalAvailability: plan.regionalAvailability
          });
        }
      }

      logger.info('Plan comparison completed', {
        planIds,
        comparisonCount: comparisons.length
      });

      return comparisons;
    } catch (error) {
      logger.error('Failed to compare plans', error, { planIds });
      throw error;
    }
  }

  /**
   * Calculate premium for a specific plan and tier
   */
  async calculatePremium(
    planId: string, 
    tier: keyof BenefitPlan['tiers'], 
    payFrequency: 'monthly' | 'biweekly' = 'monthly'
  ): Promise<PremiumCalculation | null> {
    try {
      const plan = getPlanById(planId);
      if (!plan) {
        logger.warn('Plan not found for premium calculation', { planId });
        return null;
      }

      const monthlyAmount = plan.tiers[tier];
      const biweeklyAmount = calculatePremium(planId, tier, 'biweekly');
      const annualAmount = monthlyAmount * 12;

      const calculation: PremiumCalculation = {
        planId,
        tier,
        monthlyAmount,
        biweeklyAmount,
        annualAmount,
        employeeContribution: monthlyAmount,
        employerContribution: plan.premiums.employer?.monthly || 0
      };

      logger.info('Premium calculated', {
        planId,
        tier,
        payFrequency,
        monthlyAmount,
        biweeklyAmount
      });

      return calculation;
    } catch (error) {
      logger.error('Failed to calculate premium', error, { planId, tier, payFrequency });
      throw error;
    }
  }

  /**
   * Get open enrollment information
   */
  async getOpenEnrollmentInfo(): Promise<OpenEnrollment> {
    try {
      const enrollment = amerivetBenefits2024_2025.openEnrollment;
      
      logger.info('Open enrollment info retrieved', {
        year: enrollment.year,
        effectiveDate: enrollment.effectiveDate
      });

      return enrollment;
    } catch (error) {
      logger.error('Failed to get open enrollment info', error);
      throw error;
    }
  }

  /**
   * Get eligibility rules
   */
  async getEligibilityRules(): Promise<EligibilityRules> {
    try {
      const eligibility = amerivetBenefits2024_2025.eligibility;
      
      logger.info('Eligibility rules retrieved', {
        fullTimeHours: eligibility.fullTimeHours,
        partTimeHours: eligibility.partTimeHours
      });

      return eligibility;
    } catch (error) {
      logger.error('Failed to get eligibility rules', error);
      throw error;
    }
  }

  /**
   * Check if employee is eligible for a specific plan
   */
  async checkEligibility(
    planId: string, 
    employeeType: string, 
    hoursWorked: number, 
    region: string
  ): Promise<{ eligible: boolean; reason?: string }> {
    try {
      const eligible = isEligibleForPlan(planId, employeeType, hoursWorked, region);
      
      let reason: string | undefined;
      if (!eligible) {
        const plan = getPlanById(planId);
        if (plan) {
          if (!plan.regionalAvailability.includes('nationwide') && !plan.regionalAvailability.includes(region)) {
            reason = `Plan not available in ${region}`;
          } else if (plan.eligibility.employeeType === 'full-time' && hoursWorked < 30) {
            reason = 'Full-time employees must work 30+ hours per week';
          } else if (plan.eligibility.employeeType === 'part-time' && hoursWorked < 20) {
            reason = 'Part-time employees must work 20+ hours per week';
          }
        } else {
          reason = 'Plan not found';
        }
      }

      logger.info('Eligibility checked', {
        planId,
        employeeType,
        hoursWorked,
        region,
        eligible,
        reason
      });

      return { eligible, reason };
    } catch (error) {
      logger.error('Failed to check eligibility', error, { planId, employeeType, hoursWorked, region });
      throw error;
    }
  }

  /**
   * Get plans by region
   */
  async getPlansByRegion(region: string): Promise<BenefitPlan[]> {
    try {
      const plans = getPlansByRegion(region);
      
      logger.info('Regional plans retrieved', {
        region,
        planCount: plans.length
      });

      return plans;
    } catch (error) {
      logger.error('Failed to get regional plans', error, { region });
      throw error;
    }
  }

  /**
   * Search plans by keyword
   */
  async searchPlans(keyword: string, region?: string): Promise<BenefitPlan[]> {
    try {
      let plans = await this.getAvailablePlans({ region });
      
      const searchTerm = keyword.toLowerCase();
      plans = plans.filter(plan => 
        plan.name.toLowerCase().includes(searchTerm) ||
        plan.provider.toLowerCase().includes(searchTerm) ||
        plan.type.toLowerCase().includes(searchTerm) ||
        plan.features.some(feature => feature.toLowerCase().includes(searchTerm))
      );

      logger.info('Plan search completed', {
        keyword,
        region,
        resultCount: plans.length
      });

      return plans;
    } catch (error) {
      logger.error('Failed to search plans', error, { keyword, region });
      throw error;
    }
  }

  /**
   * Get special coverage information
   */
  async getSpecialCoverage(): Promise<typeof amerivetBenefits2024_2025.specialCoverage> {
    try {
      const specialCoverage = amerivetBenefits2024_2025.specialCoverage;
      
      logger.info('Special coverage info retrieved', {
        hsaEffective: specialCoverage.hsa.effectiveDate,
        fsaEffective: specialCoverage.fsa.effectiveDate
      });

      return specialCoverage;
    } catch (error) {
      logger.error('Failed to get special coverage info', error);
      throw error;
    }
  }

  /**
   * Get all plan types available
   */
  async getPlanTypes(): Promise<string[]> {
    try {
      const planTypes = [...new Set([
        ...amerivetBenefits2024_2025.medicalPlans.map(p => p.type),
        amerivetBenefits2024_2025.dentalPlan.type,
        amerivetBenefits2024_2025.visionPlan.type,
        ...amerivetBenefits2024_2025.voluntaryPlans.map(p => p.type)
      ])];

      logger.info('Plan types retrieved', { planTypes });

      return planTypes;
    } catch (error) {
      logger.error('Failed to get plan types', error);
      throw error;
    }
  }

  /**
   * Get all providers
   */
  async getProviders(): Promise<string[]> {
    try {
      const providers = [...new Set([
        ...amerivetBenefits2024_2025.medicalPlans.map(p => p.provider),
        amerivetBenefits2024_2025.dentalPlan.provider,
        amerivetBenefits2024_2025.visionPlan.provider,
        ...amerivetBenefits2024_2025.voluntaryPlans.map(p => p.provider)
      ])];

      logger.info('Providers retrieved', { providers });

      return providers;
    } catch (error) {
      logger.error('Failed to get providers', error);
      throw error;
    }
  }
}

// Export singleton instance
export const benefitsService = new BenefitsService();
