import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import {
  companies,
  users,
  benefitPlans,
  benefitEnrollments,
} from '@/lib/db/schema';
import { nanoid } from 'nanoid';

(async () => {
  const sql = postgres(process.env.POSTGRES_URL_NO_SSL as string, { max: 1 });
  const db = drizzle(sql, {
    schema: { companies, users, benefitPlans, benefitEnrollments },
  });

  // Clear previous fixtures (idempotent)
  await db.delete(benefitEnrollments);
  await db.delete(benefitPlans);
  await db.delete(users);
  await db.delete(companies);

  // Company
  const [acme] = await db
    .insert(companies)
    .values({
      id: nanoid(),
      stackOrgId: 'org_test',
      name: 'Acme Corp',
      isActive: true,
    })
    .returning();

  // Users
  const [alice] = await db
    .insert(users)
    .values({
      id: nanoid(),
      stackUserId: 'user_alice',
      companyId: acme.id,
      email: 'alice@example.com',
      role: 'employee',
    })
    .returning();
  const [bob] = await db
    .insert(users)
    .values({
      id: nanoid(),
      stackUserId: 'user_bob',
      companyId: acme.id,
      email: 'bob@example.com',
      role: 'employee',
    })
    .returning();

  // Plans
  const [planHMO] = await db
    .insert(benefitPlans)
    .values({
      id: nanoid(),
      companyId: acme.id,
      name: 'Acme Health HMO',
      type: 'health',
      category: 'HMO',
      provider: 'HealthCo',
      monthlyPremiumEmployee: '200',
      deductibleIndividual: '1000',
      isActive: true,
      effectiveDate: '2025-01-01',
    })
    .returning();
  const [planPPO] = await db
    .insert(benefitPlans)
    .values({
      id: nanoid(),
      companyId: acme.id,
      name: 'Acme Health PPO',
      type: 'health',
      category: 'PPO',
      provider: 'HealthCo',
      monthlyPremiumEmployee: '300',
      deductibleIndividual: '500',
      isActive: true,
      effectiveDate: '2025-01-01',
    })
    .returning();

  // Enrollments
  await db.insert(benefitEnrollments).values({
    userId: alice.id,
    benefitPlanId: planHMO.id,
    coverageType: 'individual',
    enrollmentDate: '2025-01-01',
    effectiveDate: '2025-01-01',
    monthlyCost: '200',
    employeeContribution: '200',
    employerContribution: '0',
    status: 'active',
  });
  await db.insert(benefitEnrollments).values({
    userId: bob.id,
    benefitPlanId: planPPO.id,
    coverageType: 'individual',
    enrollmentDate: '2025-01-01',
    effectiveDate: '2025-01-01',
    monthlyCost: '300',
    employeeContribution: '300',
    employerContribution: '0',
    status: 'active',
  });

  await sql.end();
  console.log('Test fixtures seeded');
})();
