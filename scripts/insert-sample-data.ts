import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import {
  companies,
  users,
  benefitPlans,
  benefitEnrollments,
} from '../lib/db/schema';

// Load environment variables
config({ path: '.env.local' });

async function insertSampleData() {
  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    'postgres://neondb_owner:npg_3PRwIzrhfCo9@ep-holy-unit-ad50jybn-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

  console.log('🚀 Connecting to database...');
  const client = postgres(connectionString);
  const db = drizzle(client, {
    schema: { companies, users, benefitPlans, benefitEnrollments },
  });

  try {
    console.log('🏢 Creating sample company...');

    // Check if company already exists
    let company = await db.query.companies.findFirst({
      where: (companies, { eq }) =>
        eq(companies.stackOrgId, 'default-org-sample'),
    });

    if (!company) {
      [company] = await db
        .insert(companies)
        .values({
          stackOrgId: 'default-org-sample',
          name: 'Sample Company Inc.',
          domain: 'sample-company.com',
          settings: { theme: 'default' },
          subscriptionTier: 'premium',
          isActive: true,
        })
        .returning();
      console.log('✅ Created new company:', company.name);
    } else {
      console.log('ℹ️ Using existing company:', company.name);
    }

    console.log('👥 Creating sample users...');
    const [user1] = await db
      .insert(users)
      .values({
        stackUserId: 'sample-user-1',
        companyId: company.id,
        email: 'john.doe@sample-company.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'employee',
        employeeId: 'EMP001',
        department: 'Engineering',
        hireDate: '2023-01-15',
        isActive: true,
      })
      .returning();

    const [user2] = await db
      .insert(users)
      .values({
        stackUserId: 'sample-user-2',
        companyId: company.id,
        email: 'jane.smith@sample-company.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'hr_admin',
        employeeId: 'EMP002',
        department: 'Human Resources',
        hireDate: '2022-06-01',
        isActive: true,
      })
      .returning();

    console.log('🏥 Creating sample benefit plans...');
    const healthPlans = await db
      .insert(benefitPlans)
      .values([
        {
          companyId: company.id,
          name: 'Premium PPO Health Plan',
          type: 'health',
          category: 'PPO',
          provider: 'Blue Cross Blue Shield',
          description: 'Comprehensive health coverage with nationwide network',
          monthlyPremiumEmployee: '450.00',
          monthlyPremiumFamily: '1200.00',
          deductibleIndividual: '1000.00',
          deductibleFamily: '2000.00',
          outOfPocketMaxIndividual: '5000.00',
          outOfPocketMaxFamily: '10000.00',
          copayPrimaryCare: '25.00',
          copaySpecialist: '50.00',
          coinsurancePercentage: 20,
          features: [
            'Nationwide network',
            'No referrals needed',
            'Prescription coverage',
          ],
          effectiveDate: '2024-01-01',
          isActive: true,
        },
        {
          companyId: company.id,
          name: 'Essential HMO Health Plan',
          type: 'health',
          category: 'HMO',
          provider: 'Kaiser Permanente',
          description: 'Affordable health coverage with coordinated care',
          monthlyPremiumEmployee: '320.00',
          monthlyPremiumFamily: '850.00',
          deductibleIndividual: '1500.00',
          deductibleFamily: '3000.00',
          outOfPocketMaxIndividual: '4000.00',
          outOfPocketMaxFamily: '8000.00',
          copayPrimaryCare: '20.00',
          copaySpecialist: '40.00',
          coinsurancePercentage: 15,
          features: [
            'Lower premiums',
            'Coordinated care',
            'Preventive care covered',
          ],
          effectiveDate: '2024-01-01',
          isActive: true,
        },
        {
          companyId: company.id,
          name: 'High Deductible Health Plan',
          type: 'health',
          category: 'HDHP',
          provider: 'Aetna',
          description: 'HSA-eligible plan with lower premiums',
          monthlyPremiumEmployee: '280.00',
          monthlyPremiumFamily: '720.00',
          deductibleIndividual: '3000.00',
          deductibleFamily: '6000.00',
          outOfPocketMaxIndividual: '6000.00',
          outOfPocketMaxFamily: '12000.00',
          copayPrimaryCare: '0.00',
          copaySpecialist: '0.00',
          coinsurancePercentage: 10,
          features: [
            'HSA eligible',
            'Lowest premiums',
            'Preventive care covered',
          ],
          effectiveDate: '2024-01-01',
          isActive: true,
        },
      ])
      .returning();

    const dentalPlans = await db
      .insert(benefitPlans)
      .values([
        {
          companyId: company.id,
          name: 'Comprehensive Dental Plan',
          type: 'dental',
          category: 'PPO',
          provider: 'Delta Dental',
          description: 'Full dental coverage including orthodontics',
          monthlyPremiumEmployee: '45.00',
          monthlyPremiumFamily: '120.00',
          deductibleIndividual: '50.00',
          deductibleFamily: '150.00',
          outOfPocketMaxIndividual: '1500.00',
          outOfPocketMaxFamily: '4500.00',
          features: [
            'Preventive care covered 100%',
            'Orthodontics included',
            'Large network',
          ],
          effectiveDate: '2024-01-01',
          isActive: true,
        },
      ])
      .returning();

    const visionPlans = await db
      .insert(benefitPlans)
      .values([
        {
          companyId: company.id,
          name: 'Vision Care Plan',
          type: 'vision',
          category: 'Standard',
          provider: 'VSP',
          description: 'Comprehensive vision care coverage',
          monthlyPremiumEmployee: '15.00',
          monthlyPremiumFamily: '35.00',
          deductibleIndividual: '0.00',
          deductibleFamily: '0.00',
          outOfPocketMaxIndividual: '500.00',
          outOfPocketMaxFamily: '1500.00',
          features: [
            'Annual eye exams',
            'Frames and lenses',
            'Contact lens coverage',
          ],
          effectiveDate: '2024-01-01',
          isActive: true,
        },
      ])
      .returning();

    console.log('📋 Creating sample enrollments...');
    await db.insert(benefitEnrollments).values([
      {
        userId: user1.id,
        benefitPlanId: healthPlans[0].id, // Premium PPO
        coverageType: 'individual',
        enrollmentDate: '2024-01-01',
        effectiveDate: '2024-01-01',
        monthlyCost: '450.00',
        employeeContribution: '150.00',
        employerContribution: '300.00',
        status: 'active',
      },
      {
        userId: user1.id,
        benefitPlanId: dentalPlans[0].id,
        coverageType: 'individual',
        enrollmentDate: '2024-01-01',
        effectiveDate: '2024-01-01',
        monthlyCost: '45.00',
        employeeContribution: '15.00',
        employerContribution: '30.00',
        status: 'active',
      },
      {
        userId: user1.id,
        benefitPlanId: visionPlans[0].id,
        coverageType: 'individual',
        enrollmentDate: '2024-01-01',
        effectiveDate: '2024-01-01',
        monthlyCost: '15.00',
        employeeContribution: '5.00',
        employerContribution: '10.00',
        status: 'active',
      },
      {
        userId: user2.id,
        benefitPlanId: healthPlans[1].id, // Essential HMO
        coverageType: 'family',
        enrollmentDate: '2024-01-01',
        effectiveDate: '2024-01-01',
        monthlyCost: '850.00',
        employeeContribution: '250.00',
        employerContribution: '600.00',
        status: 'active',
      },
    ]);

    console.log('✅ Sample data inserted successfully!');
    console.log(`📊 Created:`);
    console.log(`   - 1 company: ${company.name}`);
    console.log(
      `   - 2 users: ${user1.firstName} ${user1.lastName}, ${user2.firstName} ${user2.lastName}`,
    );
    console.log(
      `   - ${healthPlans.length + dentalPlans.length + visionPlans.length} benefit plans`,
    );
    console.log(`   - 4 benefit enrollments`);
  } catch (error) {
    console.error('❌ Sample data insertion failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  insertSampleData().catch(console.error);
}

export { insertSampleData };
