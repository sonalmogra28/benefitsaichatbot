import { db } from '@/lib/db';
import { companies, users, benefitPlans, benefitEnrollments } from '@/lib/db/schema-v2';

async function seedDatabase() {
  console.log('🌱 Starting database seed...');

  try {
    // Create sample companies
    const [techCorp, healthPlus] = await db.insert(companies).values([
      {
        stackOrgId: 'org_techcorp_demo',
        name: 'TechCorp Solutions',
        domain: 'techcorp',
        settings: {
          branding: {
            primaryColor: '#0066CC',
            logo: '/logos/techcorp.png'
          },
          features: {
            documentAnalysis: true,
            aiRecommendations: true,
            customKnowledgeBase: true
          }
        },
        subscriptionTier: 'enterprise',
        isActive: true,
      },
      {
        stackOrgId: 'org_healthplus_demo',
        name: 'HealthPlus Industries',
        domain: 'healthplus',
        settings: {
          branding: {
            primaryColor: '#00AA55',
            logo: '/logos/healthplus.png'
          },
          features: {
            documentAnalysis: true,
            aiRecommendations: false,
            customKnowledgeBase: true
          }
        },
        subscriptionTier: 'professional',
        isActive: true,
      }
    ]).returning();

    console.log('✅ Created companies:', techCorp.name, healthPlus.name);

    // Create users for TechCorp
    const techCorpUsers = await db.insert(users).values([
      {
        stackUserId: 'user_tc_admin_demo',
        companyId: techCorp.id,
        email: 'admin@techcorp.com',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'company_admin',
        employeeId: 'TC001',
        department: 'Human Resources',
        hireDate: '2020-01-15',
        isActive: true,
      },
      {
        stackUserId: 'user_tc_hr_demo',
        companyId: techCorp.id,
        email: 'hr@techcorp.com',
        firstName: 'Michael',
        lastName: 'Chen',
        role: 'hr_admin',
        employeeId: 'TC002',
        department: 'Human Resources',
        hireDate: '2021-03-20',
        isActive: true,
      },
      {
        stackUserId: 'user_tc_emp1_demo',
        companyId: techCorp.id,
        email: 'john.doe@techcorp.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'employee',
        employeeId: 'TC101',
        department: 'Engineering',
        hireDate: '2022-06-01',
        isActive: true,
      },
      {
        stackUserId: 'user_tc_emp2_demo',
        companyId: techCorp.id,
        email: 'jane.smith@techcorp.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'employee',
        employeeId: 'TC102',
        department: 'Marketing',
        hireDate: '2023-01-10',
        isActive: true,
      }
    ]).returning();

    console.log(`✅ Created ${techCorpUsers.length} users for TechCorp`);

    // Create benefit plans for TechCorp
    const techCorpPlans = await db.insert(benefitPlans).values([
      {
        companyId: techCorp.id,
        name: 'TechCorp Health Plus PPO',
        type: 'health',
        category: 'PPO',
        provider: 'Blue Cross Blue Shield',
        description: 'Comprehensive PPO plan with nationwide coverage',
        monthlyPremiumEmployee: '450.00',
        monthlyPremiumFamily: '1200.00',
        deductibleIndividual: '1500.00',
        deductibleFamily: '3000.00',
        outOfPocketMaxIndividual: '6000.00',
        outOfPocketMaxFamily: '12000.00',
        copayPrimaryCare: '25.00',
        copaySpecialist: '50.00',
        coinsurancePercentage: 20,
        features: [
          'Nationwide network',
          'No referrals needed',
          'Out-of-network coverage',
          'Preventive care covered 100%',
          'Telehealth included'
        ],
        coverageDetails: {
          preventiveCare: '100% covered',
          emergencyRoom: '$250 copay',
          urgentCare: '$75 copay',
          prescriptions: {
            generic: '$10',
            preferred: '$35',
            nonPreferred: '$70',
            specialty: '20% coinsurance'
          }
        },
        effectiveDate: '2024-01-01',
        isActive: true,
      },
      {
        companyId: techCorp.id,
        name: 'TechCorp Health Smart HMO',
        type: 'health',
        category: 'HMO',
        provider: 'Kaiser Permanente',
        description: 'Cost-effective HMO plan with integrated care',
        monthlyPremiumEmployee: '350.00',
        monthlyPremiumFamily: '900.00',
        deductibleIndividual: '500.00',
        deductibleFamily: '1000.00',
        outOfPocketMaxIndividual: '4000.00',
        outOfPocketMaxFamily: '8000.00',
        copayPrimaryCare: '15.00',
        copaySpecialist: '35.00',
        coinsurancePercentage: 10,
        features: [
          'Integrated care model',
          'Low copays',
          'Preventive care covered 100%',
          'Online appointment booking',
          'Same-day appointments available'
        ],
        coverageDetails: {
          preventiveCare: '100% covered',
          emergencyRoom: '$150 copay',
          urgentCare: '$50 copay',
          prescriptions: {
            generic: '$5',
            preferred: '$20',
            nonPreferred: '$50',
            specialty: '15% coinsurance'
          }
        },
        effectiveDate: '2024-01-01',
        isActive: true,
      },
      {
        companyId: techCorp.id,
        name: 'TechCorp Dental Premium',
        type: 'dental',
        category: 'PPO',
        provider: 'Delta Dental',
        description: 'Comprehensive dental coverage',
        monthlyPremiumEmployee: '45.00',
        monthlyPremiumFamily: '120.00',
        deductibleIndividual: '50.00',
        deductibleFamily: '150.00',
        outOfPocketMaxIndividual: '1500.00',
        outOfPocketMaxFamily: '3000.00',
        features: [
          'Annual maximum $2000',
          'Preventive care 100% covered',
          'Basic procedures 80% covered',
          'Major procedures 50% covered',
          'Orthodontia coverage for dependents'
        ],
        coverageDetails: {
          preventive: '100% covered (2 cleanings/year)',
          basic: '80% after deductible',
          major: '50% after deductible',
          orthodontia: '$2000 lifetime max'
        },
        effectiveDate: '2024-01-01',
        isActive: true,
      },
      {
        companyId: techCorp.id,
        name: 'TechCorp Vision Care',
        type: 'vision',
        category: 'Standard',
        provider: 'VSP',
        description: 'Vision care with annual benefits',
        monthlyPremiumEmployee: '15.00',
        monthlyPremiumFamily: '35.00',
        features: [
          'Annual eye exam covered',
          '$150 frame allowance',
          '$150 contact lens allowance',
          '20% off additional pairs',
          'LASIK discount program'
        ],
        coverageDetails: {
          exam: '$10 copay',
          frames: '$150 allowance every 2 years',
          lenses: '$25 copay',
          contacts: '$150 allowance annually'
        },
        effectiveDate: '2024-01-01',
        isActive: true,
      }
    ]).returning();

    console.log(`✅ Created ${techCorpPlans.length} benefit plans for TechCorp`);

    // Create enrollments for employees
    const johnDoe = techCorpUsers.find(u => u.email === 'john.doe@techcorp.com');
    const janeSmith = techCorpUsers.find(u => u.email === 'jane.smith@techcorp.com');
    const ppoPlan = techCorpPlans.find(p => p.category === 'PPO' && p.type === 'health');
    const dentalPlan = techCorpPlans.find(p => p.type === 'dental');
    const visionPlan = techCorpPlans.find(p => p.type === 'vision');

    if (johnDoe && ppoPlan && dentalPlan && visionPlan) {
      await db.insert(benefitEnrollments).values([
        {
          userId: johnDoe.id,
          benefitPlanId: ppoPlan.id,
          coverageType: 'family',
          enrollmentDate: '2023-11-15',
          effectiveDate: '2024-01-01',
          monthlyCost: '1200.00',
          employerContribution: '800.00',
          employeeContribution: '400.00',
          dependents: [
            { name: 'Mary Doe', relationship: 'spouse', dateOfBirth: '1985-08-20' },
            { name: 'Alex Doe', relationship: 'child', dateOfBirth: '2015-03-10' }
          ],
          status: 'active',
        },
        {
          userId: johnDoe.id,
          benefitPlanId: dentalPlan.id,
          coverageType: 'family',
          enrollmentDate: '2023-11-15',
          effectiveDate: '2024-01-01',
          monthlyCost: '120.00',
          employerContribution: '60.00',
          employeeContribution: '60.00',
          status: 'active',
        },
        {
          userId: johnDoe.id,
          benefitPlanId: visionPlan.id,
          coverageType: 'family',
          enrollmentDate: '2023-11-15',
          effectiveDate: '2024-01-01',
          monthlyCost: '35.00',
          employerContribution: '0.00',
          employeeContribution: '35.00',
          status: 'active',
        }
      ]);

      console.log('✅ Created enrollments for John Doe');
    }

    if (janeSmith && ppoPlan && dentalPlan) {
      const hmoPlan = techCorpPlans.find(p => p.category === 'HMO' && p.type === 'health');
      
      if (hmoPlan) {
        await db.insert(benefitEnrollments).values([
          {
            userId: janeSmith.id,
            benefitPlanId: hmoPlan.id,
            coverageType: 'individual',
            enrollmentDate: '2023-11-20',
            effectiveDate: '2024-01-01',
            monthlyCost: '350.00',
            employerContribution: '250.00',
            employeeContribution: '100.00',
            status: 'active',
          },
          {
            userId: janeSmith.id,
            benefitPlanId: dentalPlan.id,
            coverageType: 'individual',
            enrollmentDate: '2023-11-20',
            effectiveDate: '2024-01-01',
            monthlyCost: '45.00',
            employerContribution: '30.00',
            employeeContribution: '15.00',
            status: 'active',
          }
        ]);

        console.log('✅ Created enrollments for Jane Smith');
      }
    }

    // Create users for HealthPlus (minimal setup)
    await db.insert(users).values([
      {
        stackUserId: 'user_hp_admin_demo',
        companyId: healthPlus.id,
        email: 'admin@healthplus.com',
        firstName: 'Robert',
        lastName: 'Williams',
        role: 'company_admin',
        employeeId: 'HP001',
        department: 'Administration',
        hireDate: '2019-05-01',
        isActive: true,
      }
    ]);

    console.log('✅ Created admin user for HealthPlus');

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Sample login credentials:');
    console.log('TechCorp Admin: admin@techcorp.com');
    console.log('TechCorp HR: hr@techcorp.com');
    console.log('TechCorp Employee: john.doe@techcorp.com');
    console.log('HealthPlus Admin: admin@healthplus.com');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run the seed function
seedDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });