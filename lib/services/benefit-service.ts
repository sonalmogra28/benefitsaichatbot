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

  async getTotalBenefitPlansCount(): Promise<number> {
    try {
      const query = 'SELECT VALUE COUNT(1) FROM c WHERE c.isActive = true';
      const { resources } = await this.plansContainer.items.query({
        query,
        parameters: []
      }).fetchAll();

      return resources[0] || 0;
    } catch (error) {
      logger.error('Error fetching total benefit plans count', { error });
      return 0;
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
      const validPlans = plans.filter(plan => plan !== null) as BenefitPlan[];

      if (validPlans.length === 0) {
        return {
          plans: [],
          comparison: {},
          summary: 'No valid plans found for comparison'
        };
      }

      // Implement comprehensive comparison logic based on criteria
      const comparison: any = {};
      
      // Cost comparison
      if (criteria.includes('cost') || criteria.length === 0) {
        comparison.cost = {
          monthly: validPlans.map(plan => ({
            id: plan.id,
            name: plan.name,
            monthlyCost: plan.monthlyCost,
            annualCost: plan.monthlyCost * 12,
            costPerEmployee: plan.monthlyCost
          })),
          summary: this.generateCostSummary(validPlans)
        };
      }

      // Coverage comparison
      if (criteria.includes('coverage') || criteria.length === 0) {
        comparison.coverage = {
          medical: validPlans.map(plan => ({
            id: plan.id,
            name: plan.name,
            coveragePercentage: plan.coveragePercentage,
            deductible: plan.deductible,
            outOfPocketMax: plan.outOfPocketMax
          })),
          summary: this.generateCoverageSummary(validPlans)
        };
      }

      // Benefits comparison
      if (criteria.includes('benefits') || criteria.length === 0) {
        comparison.benefits = {
          included: validPlans.map(plan => ({
            id: plan.id,
            name: plan.name,
            benefits: plan.benefits || [],
            features: plan.features || []
          })),
          summary: this.generateBenefitsSummary(validPlans)
        };
      }

      // Network comparison
      if (criteria.includes('network') || criteria.length === 0) {
        comparison.network = {
          providers: validPlans.map(plan => ({
            id: plan.id,
            name: plan.name,
            networkSize: plan.networkSize || 'Standard',
            providerCount: plan.providerCount || 0
          })),
          summary: this.generateNetworkSummary(validPlans)
        };
      }

      // Overall recommendation
      const recommendation = this.generateRecommendation(validPlans, criteria);

      return {
        plans: validPlans,
        comparison,
        recommendation,
        criteria: criteria.length > 0 ? criteria : ['cost', 'coverage', 'benefits', 'network']
      };
    } catch (error) {
      logger.error('Error comparing benefit plans', { error, planIds, criteria });
      throw error;
    }
  }

  private generateCostSummary(plans: BenefitPlan[]): string {
    const costs = plans.map(p => p.monthlyCost);
    const minCost = Math.min(...costs);
    const maxCost = Math.max(...costs);
    const avgCost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;
    
    const cheapestPlan = plans.find(p => p.monthlyCost === minCost);
    const mostExpensivePlan = plans.find(p => p.monthlyCost === maxCost);
    
    return `Cost ranges from $${minCost}/month (${cheapestPlan?.name}) to $${maxCost}/month (${mostExpensivePlan?.name}), with an average of $${avgCost.toFixed(2)}/month.`;
  }

  private generateCoverageSummary(plans: BenefitPlan[]): string {
    const coverages = plans.map(p => p.coveragePercentage);
    const minCoverage = Math.min(...coverages);
    const maxCoverage = Math.max(...coverages);
    
    const bestCoveragePlan = plans.find(p => p.coveragePercentage === maxCoverage);
    
    return `Coverage ranges from ${minCoverage}% to ${maxCoverage}% (${bestCoveragePlan?.name}). Higher coverage typically means lower out-of-pocket costs.`;
  }

  private generateBenefitsSummary(plans: BenefitPlan[]): string {
    const allBenefits = new Set();
    plans.forEach(plan => {
      if (plan.benefits) {
        plan.benefits.forEach(benefit => allBenefits.add(benefit));
      }
    });
    
    const commonBenefits = Array.from(allBenefits).filter(benefit => 
      plans.every(plan => plan.benefits?.includes(benefit as string))
    );
    
    return `All plans include: ${commonBenefits.join(', ')}. ${plans.length} unique benefit combinations available.`;
  }

  private generateNetworkSummary(plans: BenefitPlan[]): string {
    const networks = plans.map(p => p.networkSize || 'Standard');
    const uniqueNetworks = [...new Set(networks)];
    
    return `Network options include: ${uniqueNetworks.join(', ')}. Consider provider availability in your area.`;
  }

  private generateRecommendation(plans: BenefitPlan[], criteria: string[]): any {
    if (plans.length === 1) {
      return {
        type: 'single_option',
        message: 'Only one plan available for comparison.',
        recommendedPlan: plans[0].id
      };
    }

    // Score plans based on criteria
    const scoredPlans = plans.map(plan => {
      let score = 0;
      let factors = [];

      if (criteria.includes('cost') || criteria.length === 0) {
        // Lower cost = higher score
        const maxCost = Math.max(...plans.map(p => p.monthlyCost));
        const costScore = (maxCost - plan.monthlyCost) / maxCost * 100;
        score += costScore * 0.3;
        factors.push(`Cost: ${costScore.toFixed(1)}/100`);
      }

      if (criteria.includes('coverage') || criteria.length === 0) {
        // Higher coverage = higher score
        const coverageScore = plan.coveragePercentage;
        score += coverageScore * 0.4;
        factors.push(`Coverage: ${coverageScore}%`);
      }

      if (criteria.includes('benefits') || criteria.length === 0) {
        // More benefits = higher score
        const benefitCount = plan.benefits?.length || 0;
        const maxBenefits = Math.max(...plans.map(p => p.benefits?.length || 0));
        const benefitScore = maxBenefits > 0 ? (benefitCount / maxBenefits) * 100 : 0;
        score += benefitScore * 0.2;
        factors.push(`Benefits: ${benefitScore.toFixed(1)}/100`);
      }

      if (criteria.includes('network') || criteria.length === 0) {
        // Larger network = higher score
        const networkScore = plan.networkSize === 'Large' ? 100 : plan.networkSize === 'Standard' ? 70 : 50;
        score += networkScore * 0.1;
        factors.push(`Network: ${networkScore}/100`);
      }

      return {
        plan,
        score: Math.round(score),
        factors
      };
    });

    // Sort by score (highest first)
    scoredPlans.sort((a, b) => b.score - a.score);
    
    const bestPlan = scoredPlans[0];
    const secondBest = scoredPlans[1];

    return {
      type: 'comparison',
      recommendedPlan: bestPlan.plan.id,
      score: bestPlan.score,
      factors: bestPlan.factors,
      message: `Based on your criteria, ${bestPlan.plan.name} scores highest (${bestPlan.score}/100). ${secondBest ? `Alternative: ${secondBest.plan.name} (${secondBest.score}/100).` : ''}`,
      allScores: scoredPlans.map(sp => ({
        planId: sp.plan.id,
        planName: sp.plan.name,
        score: sp.score,
        factors: sp.factors
      }))
    };
  }
}

export const benefitService = new BenefitService();
