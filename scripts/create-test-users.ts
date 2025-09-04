#!/usr/bin/env tsx
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import path from 'node:path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Initialize Firebase Admin
if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : undefined;

  if (!serviceAccount) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT not found in environment');
    process.exit(1);
  }

  initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const auth = getAuth();
const db = getFirestore();

interface TestUser {
  email: string;
  password: string;
  displayName: string;
  role: string;
  companyId?: string;
  companyName?: string;
}

const TEST_USERS: TestUser[] = [
  {
    email: 'superadmin@test.com',
    password: 'TestPass123!',
    displayName: 'Super Admin',
    role: 'super_admin',
  },
  {
    email: 'platformadmin@test.com',
    password: 'TestPass123!',
    displayName: 'Platform Admin',
    role: 'platform_admin',
  },
  {
    email: 'companyadmin@acme.com',
    password: 'TestPass123!',
    displayName: 'ACME Company Admin',
    role: 'company_admin',
    companyId: 'acme-corp',
    companyName: 'ACME Corporation',
  },
  {
    email: 'hradmin@acme.com',
    password: 'TestPass123!',
    displayName: 'ACME HR Admin',
    role: 'hr_admin',
    companyId: 'acme-corp',
    companyName: 'ACME Corporation',
  },
  {
    email: 'employee@acme.com',
    password: 'TestPass123!',
    displayName: 'John Employee',
    role: 'employee',
    companyId: 'acme-corp',
    companyName: 'ACME Corporation',
  },
];

async function createTestCompany(companyId: string, companyName: string) {
  try {
    const companyRef = db.collection('companies').doc(companyId);
    const companyDoc = await companyRef.get();

    if (!companyDoc.exists) {
      await companyRef.set({
        id: companyId,
        name: companyName,
        status: 'active',
        employeeCount: 0,
        planCount: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        settings: {
          allowSelfRegistration: true,
          requireEmailVerification: false,
          defaultRole: 'employee',
        },
      });
      console.log(`✅ Created company: ${companyName}`);
    } else {
      console.log(`ℹ️  Company already exists: ${companyName}`);
    }
  } catch (error) {
    console.error(`❌ Error creating company ${companyName}:`, error);
  }
}

async function createTestUser(testUser: TestUser) {
  try {
    // First, create the company if needed
    if (testUser.companyId && testUser.companyName) {
      await createTestCompany(testUser.companyId, testUser.companyName);
    }

    // Try to get existing user
    let userRecord: any;
    try {
      userRecord = await auth.getUserByEmail(testUser.email);
      console.log(`ℹ️  User exists: ${testUser.email}`);

      // Update the user's password
      await auth.updateUser(userRecord.uid, {
        password: testUser.password,
        displayName: testUser.displayName,
      });
    } catch (error) {
      // User doesn't exist, create new one
      userRecord = await auth.createUser({
        email: testUser.email,
        password: testUser.password,
        displayName: testUser.displayName,
        emailVerified: true,
      });
      console.log(`✅ Created user: ${testUser.email}`);
    }

    // Set custom claims
    const customClaims: any = {
      role: testUser.role,
    };

    if (testUser.companyId) {
      customClaims.companyId = testUser.companyId;
    }

    await auth.setCustomUserClaims(userRecord.uid, customClaims);
    console.log(`✅ Set role '${testUser.role}' for ${testUser.email}`);

    // Create/update user document in Firestore
    const userDocRef = db.collection('users').doc(userRecord.uid);
    await userDocRef.set(
      {
        uid: userRecord.uid,
        email: testUser.email,
        displayName: testUser.displayName,
        role: testUser.role,
        companyId: testUser.companyId || null,
        companyName: testUser.companyName || null,
        emailVerified: true,
        status: 'active',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    // If company user, also add to company's users subcollection
    if (testUser.companyId) {
      const companyUserRef = db
        .collection('companies')
        .doc(testUser.companyId)
        .collection('users')
        .doc(userRecord.uid);

      await companyUserRef.set(
        {
          uid: userRecord.uid,
          email: testUser.email,
          displayName: testUser.displayName,
          role: testUser.role,
          status: 'active',
          joinedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      // Update employee count
      const companyRef = db.collection('companies').doc(testUser.companyId);
      const companyDoc = await companyRef.get();
      if (companyDoc.exists) {
        const currentCount = companyDoc.data()?.employeeCount || 0;
        await companyRef.update({
          employeeCount: currentCount + 1,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
  } catch (error) {
    console.error(`❌ Error creating user ${testUser.email}:`, error);
  }
}

async function createTestBenefitPlans(companyId: string) {
  const plans = [
    {
      id: 'health-basic',
      name: 'Basic Health Plan',
      type: 'health',
      provider: 'BlueCross BlueShield',
      premium: 250,
      deductible: 2000,
      coverage: 'Individual',
    },
    {
      id: 'health-premium',
      name: 'Premium Health Plan',
      type: 'health',
      provider: 'Aetna',
      premium: 450,
      deductible: 500,
      coverage: 'Family',
    },
    {
      id: 'dental-standard',
      name: 'Standard Dental',
      type: 'dental',
      provider: 'Delta Dental',
      premium: 35,
      deductible: 100,
      coverage: 'Individual',
    },
  ];

  for (const plan of plans) {
    try {
      const planRef = db
        .collection('companies')
        .doc(companyId)
        .collection('benefitPlans')
        .doc(plan.id);

      await planRef.set({
        ...plan,
        companyId,
        status: 'active',
        enrollmentOpen: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      console.log(`✅ Created benefit plan: ${plan.name}`);
    } catch (error) {
      console.error(`❌ Error creating plan ${plan.name}:`, error);
    }
  }

  // Update plan count
  const companyRef = db.collection('companies').doc(companyId);
  await companyRef.update({
    planCount: plans.length,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function main() {
  console.log('🚀 Creating test users and data...\n');

  // Create all test users
  for (const testUser of TEST_USERS) {
    await createTestUser(testUser);
  }

  // Create benefit plans for ACME Corporation
  console.log('\n📋 Creating test benefit plans...');
  await createTestBenefitPlans('acme-corp');

  console.log('\n✅ Test data creation complete!\n');
  console.log('📝 Test Credentials:');
  console.log('────────────────────');
  TEST_USERS.forEach((user) => {
    console.log(
      `${user.role.padEnd(15)} | ${user.email.padEnd(25)} | ${user.password}`,
    );
  });
  console.log('────────────────────\n');

  console.log('🔗 Test URLs:');
  console.log('  - Employee Chat: http://localhost:3000');
  console.log('  - Login: http://localhost:3000/login');
  console.log('  - Super Admin: http://localhost:3000/super-admin');
  console.log('  - Company Admin: http://localhost:3000/company-admin');
  console.log('  - Platform Admin: http://localhost:3000/admin\n');

  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
