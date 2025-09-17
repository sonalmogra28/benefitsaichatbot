import { describe, it, expect, beforeEach, vi } from 'vitest';
import { benefitsService } from '@/lib/services/benefits.service';

// Mock the logger
vi.mock('@/lib/logging/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

describe('Benefits Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAvailablePlans', () => {
    it('should return all plans when no filters applied', async () => {
      const plans = await benefitsService.getAvailablePlans();
      
      expect(plans).toBeDefined();
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThan(0);
    });

    it('should filter plans by region', async () => {
      const californiaPlans = await benefitsService.getAvailablePlans({ region: 'California' });
      const nationwidePlans = await benefitsService.getAvailablePlans({ region: 'nationwide' });
      
      expect(californiaPlans.length).toBeGreaterThan(0);
      expect(nationwidePlans.length).toBeGreaterThan(0);
      
      // California should have Kaiser plans
      const kaiserPlans = californiaPlans.filter(plan => plan.provider === 'Kaiser');
      expect(kaiserPlans.length).toBeGreaterThan(0);
    });

    it('should filter plans by type', async () => {
      const medicalPlans = await benefitsService.getAvailablePlans({ planType: 'medical' });
      const dentalPlans = await benefitsService.getAvailablePlans({ planType: 'dental' });
      
      expect(medicalPlans.every(plan => plan.type === 'medical')).toBe(true);
      expect(dentalPlans.every(plan => plan.type === 'dental')).toBe(true);
    });

    it('should filter plans by provider', async () => {
      const bcbstxPlans = await benefitsService.getAvailablePlans({ provider: 'BCBSTX' });
      const kaiserPlans = await benefitsService.getAvailablePlans({ provider: 'Kaiser' });
      
      expect(bcbstxPlans.every(plan => plan.provider === 'BCBSTX')).toBe(true);
      expect(kaiserPlans.every(plan => plan.provider === 'Kaiser')).toBe(true);
    });
  });

  describe('getPlanDetails', () => {
    it('should return plan details for valid plan ID', async () => {
      const plan = await benefitsService.getPlanDetails('bcbstx-standard-hsa');
      
      expect(plan).toBeDefined();
      expect(plan?.id).toBe('bcbstx-standard-hsa');
      expect(plan?.name).toBe('Standard HSA');
      expect(plan?.provider).toBe('BCBSTX');
    });

    it('should return null for invalid plan ID', async () => {
      const plan = await benefitsService.getPlanDetails('invalid-plan-id');
      
      expect(plan).toBeNull();
    });
  });

  describe('comparePlans', () => {
    it('should compare multiple plans', async () => {
      const planIds = ['bcbstx-standard-hsa', 'bcbstx-enhanced-hsa', 'kaiser-standard-hmo'];
      const comparisons = await benefitsService.comparePlans(planIds);
      
      expect(comparisons).toBeDefined();
      expect(Array.isArray(comparisons)).toBe(true);
      expect(comparisons.length).toBe(3);
      
      comparisons.forEach(comparison => {
        expect(comparison).toHaveProperty('planId');
        expect(comparison).toHaveProperty('name');
        expect(comparison).toHaveProperty('provider');
        expect(comparison).toHaveProperty('monthlyPremium');
        expect(comparison).toHaveProperty('biweeklyPremium');
      });
    });

    it('should handle invalid plan IDs gracefully', async () => {
      const planIds = ['bcbstx-standard-hsa', 'invalid-plan-id'];
      const comparisons = await benefitsService.comparePlans(planIds);
      
      expect(comparisons).toBeDefined();
      expect(Array.isArray(comparisons)).toBe(true);
      expect(comparisons.length).toBe(1); // Only valid plan returned
    });
  });

  describe('calculatePremium', () => {
    it('should calculate premium for employee only tier', async () => {
      const calculation = await benefitsService.calculatePremium(
        'bcbstx-standard-hsa',
        'employeeOnly',
        'monthly'
      );
      
      expect(calculation).toBeDefined();
      expect(calculation?.planId).toBe('bcbstx-standard-hsa');
      expect(calculation?.tier).toBe('employeeOnly');
      expect(calculation?.monthlyAmount).toBe(86.84);
      expect(calculation?.biweeklyAmount).toBeCloseTo(40.08, 1);
      expect(calculation?.annualAmount).toBe(1042.08);
    });

    it('should calculate premium for different tiers', async () => {
      const employeeOnly = await benefitsService.calculatePremium(
        'bcbstx-dental',
        'employeeOnly',
        'monthly'
      );
      
      const employeeFamily = await benefitsService.calculatePremium(
        'bcbstx-dental',
        'employeeFamily',
        'monthly'
      );
      
      expect(employeeOnly?.monthlyAmount).toBe(28.90);
      expect(employeeFamily?.monthlyAmount).toBe(113.93);
    });

    it('should return null for invalid plan ID', async () => {
      const calculation = await benefitsService.calculatePremium(
        'invalid-plan-id',
        'employeeOnly',
        'monthly'
      );
      
      expect(calculation).toBeNull();
    });
  });

  describe('checkEligibility', () => {
    it('should return eligible for full-time employee in California', async () => {
      const eligibility = await benefitsService.checkEligibility(
        'kaiser-standard-hmo',
        'full-time',
        40,
        'California'
      );
      
      expect(eligibility.eligible).toBe(true);
      expect(eligibility.reason).toBeUndefined();
    });

    it('should return not eligible for part-time employee with Kaiser plan', async () => {
      const eligibility = await benefitsService.checkEligibility(
        'kaiser-standard-hmo',
        'part-time',
        15,
        'California'
      );
      
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toContain('Full-time employees must work 30+ hours per week');
    });

    it('should return not eligible for Kaiser plan outside coverage area', async () => {
      const eligibility = await benefitsService.checkEligibility(
        'kaiser-standard-hmo',
        'full-time',
        40,
        'Texas'
      );
      
      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toContain('Plan not available in Texas');
    });
  });

  describe('searchPlans', () => {
    it('should search plans by name', async () => {
      const results = await benefitsService.searchPlans('HSA');
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(plan => 
        plan.name.toLowerCase().includes('hsa') ||
        plan.features.some(feature => feature.toLowerCase().includes('hsa'))
      )).toBe(true);
    });

    it('should search plans by provider', async () => {
      const results = await benefitsService.searchPlans('Kaiser');
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.every(plan => plan.provider === 'Kaiser')).toBe(true);
    });

    it('should return empty array for no matches', async () => {
      const results = await benefitsService.searchPlans('nonexistent');
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe('getOpenEnrollmentInfo', () => {
    it('should return open enrollment information', async () => {
      const enrollment = await benefitsService.getOpenEnrollmentInfo();
      
      expect(enrollment).toBeDefined();
      expect(enrollment).toHaveProperty('year');
      expect(enrollment).toHaveProperty('effectiveDate');
      expect(enrollment.year).toBe('2024-2025');
      expect(enrollment.effectiveDate).toBe('2024-10-01');
    });
  });

  describe('getEligibilityRules', () => {
    it('should return eligibility rules', async () => {
      const rules = await benefitsService.getEligibilityRules();
      
      expect(rules).toBeDefined();
      expect(rules).toHaveProperty('fullTimeHours');
      expect(rules).toHaveProperty('partTimeHours');
      expect(rules).toHaveProperty('coverageEffective');
      expect(rules).toHaveProperty('dependents');
      expect(rules.fullTimeHours).toBe(30);
      expect(rules.partTimeHours).toBe(20);
    });
  });

  describe('getPlansByRegion', () => {
    it('should return plans available in California', async () => {
      const plans = await benefitsService.getPlansByRegion('California');
      
      expect(plans).toBeDefined();
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThan(0);
      
      // Should include both Kaiser and BCBSTX plans
      const providers = [...new Set(plans.map(plan => plan.provider))];
      expect(providers).toContain('Kaiser');
      expect(providers).toContain('BCBSTX');
    });

    it('should return only nationwide plans for non-coverage region', async () => {
      const plans = await benefitsService.getPlansByRegion('Texas');
      
      expect(plans).toBeDefined();
      expect(Array.isArray(plans)).toBe(true);
      
      // Should only include BCBSTX plans (nationwide)
      const kaiserPlans = plans.filter(plan => plan.provider === 'Kaiser');
      expect(kaiserPlans.length).toBe(0);
    });
  });

  describe('getPlanTypes', () => {
    it('should return all available plan types', async () => {
      const planTypes = await benefitsService.getPlanTypes();
      
      expect(planTypes).toBeDefined();
      expect(Array.isArray(planTypes)).toBe(true);
      expect(planTypes).toContain('medical');
      expect(planTypes).toContain('dental');
      expect(planTypes).toContain('vision');
      expect(planTypes).toContain('voluntary');
    });
  });

  describe('getProviders', () => {
    it('should return all providers', async () => {
      const providers = await benefitsService.getProviders();
      
      expect(providers).toBeDefined();
      expect(Array.isArray(providers)).toBe(true);
      expect(providers).toContain('BCBSTX');
      expect(providers).toContain('Kaiser');
      expect(providers).toContain('Unum');
    });
  });
});
