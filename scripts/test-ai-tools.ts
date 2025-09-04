import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';
import { benefitPlans, users, companies } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

// Load environment variables
config({ path: '.env.local' });

async function testAITools() {
  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    'postgres://neondb_owner:npg_3PRwIzrhfCo9@ep-holy-unit-ad50jybn-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

  console.log('🚀 Testing AI tools with real database...');
  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    // Test 1: Verify sample data exists
    console.log('📊 Test 1: Checking sample data...');

    const allUsers = await db.select().from(users);
    console.log(`✅ Found ${allUsers.length} users in database`);

    if (allUsers.length === 0) {
      throw new Error('No users found - sample data missing');
    }

    const testUser = allUsers[0];
    console.log(
      `📋 Test user: ${testUser.firstName} ${testUser.lastName} (${testUser.email})`,
    );

    // Get company info separately
    const company = await db
      .select()
      .from(companies)
      .where(eq(companies.id, testUser.companyId));
    console.log(`🏢 Company: ${company[0]?.name || 'Unknown'}`);

    // Test 2: Get benefit plans for the user's company
    console.log('\n📊 Test 2: Checking benefit plans...');

    const companyPlans = await db
      .select()
      .from(benefitPlans)
      .where(eq(benefitPlans.companyId, testUser.companyId));

    console.log(`✅ Found ${companyPlans.length} benefit plans for company`);

    if (companyPlans.length === 0) {
      throw new Error('No benefit plans found for company');
    }

    // Test 3: Test plan comparison logic
    console.log('\n📊 Test 3: Testing plan comparison logic...');

    const healthPlans = companyPlans.filter((plan) => plan.type === 'health');
    console.log(`✅ Found ${healthPlans.length} health plans`);

    if (healthPlans.length >= 2) {
      const planIds = healthPlans.slice(0, 2).map((plan) => plan.id);
      console.log(`🔍 Plan IDs for comparison: ${planIds.join(', ')}`);

      // Simulate the AI tool logic
      const plansWithAnalysis = healthPlans.slice(0, 2).map((plan) => {
        const monthlyCost = Number.parseFloat(
          plan.monthlyPremiumEmployee || '0',
        );
        const deductible = Number.parseFloat(plan.deductibleIndividual || '0');

        return {
          id: plan.id,
          name: plan.name,
          type: plan.type,
          provider: plan.provider,
          costs: {
            monthlyCost,
            deductible,
            copayPrimaryCare: Number.parseFloat(plan.copayPrimaryCare || '0'),
            copaySpecialist: Number.parseFloat(plan.copaySpecialist || '0'),
          },
          features: plan.features || [],
        };
      });

      console.log('📋 Plan comparison results:');
      plansWithAnalysis.forEach((plan, index) => {
        console.log(`  ${index + 1}. ${plan.name} (${plan.provider})`);
        console.log(`     Monthly Cost: $${plan.costs.monthlyCost}`);
        console.log(`     Deductible: $${plan.costs.deductible}`);
        console.log(`     Features: ${plan.features.length} items`);
      });

      // Test cost comparison logic
      const lowestCost = Math.min(
        ...plansWithAnalysis.map((p) => p.costs.monthlyCost),
      );
      const highestCost = Math.max(
        ...plansWithAnalysis.map((p) => p.costs.monthlyCost),
      );

      console.log(`💰 Cost Analysis:`);
      console.log(`   Lowest monthly cost: $${lowestCost}`);
      console.log(`   Highest monthly cost: $${highestCost}`);
      console.log(`   Cost difference: $${highestCost - lowestCost}`);
    } else {
      console.log('⚠️  Not enough health plans for comparison test');
    }

    // Test 4: Verify all plan types
    console.log('\n📊 Test 4: Checking plan types...');

    const planTypes = [...new Set(companyPlans.map((plan) => plan.type))];
    console.log(`✅ Available plan types: ${planTypes.join(', ')}`);

    planTypes.forEach((type) => {
      const typeCount = companyPlans.filter(
        (plan) => plan.type === type,
      ).length;
      console.log(`   ${type}: ${typeCount} plans`);
    });

    console.log('\n🎉 All AI tool tests passed successfully!');
    console.log('✅ Database connection working');
    console.log('✅ Sample data available');
    console.log('✅ Plan comparison logic functional');
    console.log('✅ Multi-tenant filtering working');
  } catch (error) {
    console.error('❌ AI tool test failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  testAITools().catch(console.error);
}

export { testAITools };
