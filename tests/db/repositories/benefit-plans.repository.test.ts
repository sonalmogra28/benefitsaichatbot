import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { BenefitPlansRepository } from '../../../lib/db/repositories/benefit-plans.repository';
import {
  companies,
  users,
  benefitPlans,
  benefitEnrollments,
} from '../../../lib/db/schema';

/**
 * Integration tests for BenefitPlansRepository
 *
 * These tests validate the repository layer with real database operations
 * and ensure proper tenant isolation.
 */

describe('BenefitPlansRepository', () => {
  let client: postgres.Sql;
  let db: ReturnType<typeof drizzle>;
  let repository: BenefitPlansRepository;
  let testCompanyId: string;
  let testUserId: string;
  let testStackOrgId: string;

  beforeAll(async () => {
    // Use test database connection
    const connectionString =
      process.env.POSTGRES_URL_NO_SSL || process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error('Test database connection string not found');
    }

    client = postgres(connectionString);
    db = drizzle(client);
    repository = new BenefitPlansRepository();
  });

  afterAll(async () => {
    await client.end();
  });

  beforeEach(async () => {
    // Create test company and user for each test
    testStackOrgId = `test-org-${Date.now()}`;

    const [company] = await db
      .insert(companies)
      .values({
        stackOrgId: testStackOrgId,
        name: 'Test Company',
        settings: {},
        subscriptionTier: 'basic',
        isActive: true,
      })
      .returning();

    testCompanyId = company.id;

    const [user] = await db
      .insert(users)
      .values({
        stackUserId: `test-user-${Date.now()}`,
        companyId: testCompanyId,
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'employee',
        isActive: true,
      })
      .returning();

    testUserId = user.id;
  });

  describe('findByCompany', () => {
    it('should return active benefit plans for a company', async () => {
      // Create test benefit plans
      await db.insert(benefitPlans).values([
        {
          companyId: testCompanyId,
          name: 'Test Health Plan',
          type: 'health',
          category: 'PPO',
          provider: 'Test Provider',
          monthlyPremiumEmployee: '500.00',
          deductibleIndividual: '1000.00',
          effectiveDate: new Date('2024-01-01'),
          isActive: true,
        },
        {
          companyId: testCompanyId,
          name: 'Test Dental Plan',
          type: 'dental',
          category: 'PPO',
          provider: 'Test Dental Provider',
          monthlyPremiumEmployee: '75.00',
          deductibleIndividual: '100.00',
          effectiveDate: new Date('2024-01-01'),
          isActive: true,
        },
        {
          companyId: testCompanyId,
          name: 'Inactive Plan',
          type: 'health',
          category: 'HMO',
          provider: 'Test Provider',
          monthlyPremiumEmployee: '400.00',
          effectiveDate: new Date('2024-01-01'),
          isActive: false, // This should not be returned
        },
      ]);

      const plans = await repository.findByCompany(
        testStackOrgId,
        testCompanyId,
      );

      expect(plans).toHaveLength(2);
      expect(plans.every((plan) => plan.isActive)).toBe(true);
      expect(plans.map((p) => p.name)).toEqual([
        'Test Dental Plan',
        'Test Health Plan',
      ]);
    });

    it('should enforce tenant isolation', async () => {
      // Create another company
      const [otherCompany] = await db
        .insert(companies)
        .values({
          stackOrgId: 'other-org',
          name: 'Other Company',
          settings: {},
          subscriptionTier: 'basic',
          isActive: true,
        })
        .returning();

      // Create plan for other company
      await db.insert(benefitPlans).values({
        companyId: otherCompany.id,
        name: 'Other Company Plan',
        type: 'health',
        category: 'PPO',
        provider: 'Other Provider',
        monthlyPremiumEmployee: '600.00',
        effectiveDate: new Date('2024-01-01'),
        isActive: true,
      });

      // Should not return plans from other company
      const plans = await repository.findByCompany(
        testStackOrgId,
        testCompanyId,
      );
      expect(plans).toHaveLength(0);
    });
  });

  describe('findByType', () => {
    it('should return plans filtered by type', async () => {
      await db.insert(benefitPlans).values([
        {
          companyId: testCompanyId,
          name: 'Health Plan 1',
          type: 'health',
          category: 'PPO',
          provider: 'Provider 1',
          monthlyPremiumEmployee: '500.00',
          effectiveDate: new Date('2024-01-01'),
          isActive: true,
        },
        {
          companyId: testCompanyId,
          name: 'Health Plan 2',
          type: 'health',
          category: 'HMO',
          provider: 'Provider 2',
          monthlyPremiumEmployee: '400.00',
          effectiveDate: new Date('2024-01-01'),
          isActive: true,
        },
        {
          companyId: testCompanyId,
          name: 'Dental Plan',
          type: 'dental',
          category: 'PPO',
          provider: 'Dental Provider',
          monthlyPremiumEmployee: '75.00',
          effectiveDate: new Date('2024-01-01'),
          isActive: true,
        },
      ]);

      const healthPlans = await repository.findByType(
        testStackOrgId,
        testCompanyId,
        'health',
      );

      expect(healthPlans).toHaveLength(2);
      expect(healthPlans.every((plan) => plan.type === 'health')).toBe(true);
      // Should be ordered by premium (ascending)
      expect(healthPlans[0].name).toBe('Health Plan 2'); // $400
      expect(healthPlans[1].name).toBe('Health Plan 1'); // $500
    });
  });

  describe('calculateUserBenefitsCosts', () => {
    it('should calculate total costs for user enrollments', async () => {
      // Create benefit plans
      const [healthPlan] = await db
        .insert(benefitPlans)
        .values({
          companyId: testCompanyId,
          name: 'Health Plan',
          type: 'health',
          category: 'PPO',
          provider: 'Health Provider',
          monthlyPremiumEmployee: '500.00',
          effectiveDate: new Date('2024-01-01'),
          isActive: true,
        })
        .returning();

      const [dentalPlan] = await db
        .insert(benefitPlans)
        .values({
          companyId: testCompanyId,
          name: 'Dental Plan',
          type: 'dental',
          category: 'PPO',
          provider: 'Dental Provider',
          monthlyPremiumEmployee: '75.00',
          effectiveDate: new Date('2024-01-01'),
          isActive: true,
        })
        .returning();

      // Create enrollments
      await db.insert(benefitEnrollments).values([
        {
          userId: testUserId,
          benefitPlanId: healthPlan.id,
          coverageType: 'individual',
          enrollmentDate: new Date('2024-01-01'),
          effectiveDate: new Date('2024-01-01'),
          monthlyCost: '500.00',
          employeeContribution: '150.00',
          employerContribution: '350.00',
          status: 'active',
        },
        {
          userId: testUserId,
          benefitPlanId: dentalPlan.id,
          coverageType: 'individual',
          enrollmentDate: new Date('2024-01-01'),
          effectiveDate: new Date('2024-01-01'),
          monthlyCost: '75.00',
          employeeContribution: '25.00',
          employerContribution: '50.00',
          status: 'active',
        },
      ]);

      const costs = await repository.calculateUserBenefitsCosts(
        testStackOrgId,
        testUserId,
      );

      expect(costs.totalMonthlyCost).toBe(575);
      expect(costs.totalEmployeeContribution).toBe(175);
      expect(costs.totalEmployerContribution).toBe(400);
      expect(costs.enrollments).toHaveLength(2);
    });
  });

  describe('getComparisonData', () => {
    it('should return comparison data with adjusted premiums for family size', async () => {
      await db.insert(benefitPlans).values({
        companyId: testCompanyId,
        name: 'Family Health Plan',
        type: 'health',
        category: 'PPO',
        provider: 'Health Provider',
        monthlyPremiumEmployee: '500.00',
        monthlyPremiumFamily: '1200.00',
        effectiveDate: new Date('2024-01-01'),
        isActive: true,
      });

      const comparisonData = await repository.getComparisonData(
        testStackOrgId,
        testCompanyId,
        'health',
        4, // family size
      );

      expect(comparisonData).toHaveLength(1);
      expect(comparisonData[0].adjustedPremium).toBe(1200); // Family premium
    });

    it('should use employee premium for individual coverage', async () => {
      await db.insert(benefitPlans).values({
        companyId: testCompanyId,
        name: 'Individual Health Plan',
        type: 'health',
        category: 'PPO',
        provider: 'Health Provider',
        monthlyPremiumEmployee: '500.00',
        monthlyPremiumFamily: '1200.00',
        effectiveDate: new Date('2024-01-01'),
        isActive: true,
      });

      const comparisonData = await repository.getComparisonData(
        testStackOrgId,
        testCompanyId,
        'health',
        1, // individual
      );

      expect(comparisonData).toHaveLength(1);
      expect(comparisonData[0].adjustedPremium).toBe(500); // Employee premium
    });
  });

  describe('create', () => {
    it('should create a new benefit plan', async () => {
      const planData = {
        companyId: testCompanyId,
        name: 'New Test Plan',
        type: 'vision' as const,
        category: 'Standard',
        provider: 'Vision Provider',
        monthlyPremiumEmployee: '25.00',
        deductibleIndividual: '50.00',
        effectiveDate: new Date('2024-01-01'),
        isActive: true,
      };

      const createdPlan = await repository.create(testStackOrgId, planData);

      expect(createdPlan.name).toBe('New Test Plan');
      expect(createdPlan.type).toBe('vision');
      expect(createdPlan.companyId).toBe(testCompanyId);
      expect(createdPlan.createdAt).toBeDefined();
      expect(createdPlan.updatedAt).toBeDefined();
    });
  });
});
