#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-admin-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://benefitschatbotac-383.firebaseio.com`,
});

async function createUsers() {
  const users = [
    {
      email: 'admin@benefitschat.com',
      password: 'Admin123!@#',
      displayName: 'Admin User',
      role: 'super_admin',
    },
    {
      email: 'employee@benefitschat.com',
      password: 'Employee123!',
      displayName: 'Employee User',
      role: 'employee',
      companyId: 'default-company',
    },
  ];

  for (const userData of users) {
    try {
      // Create user in Firebase Auth
      const userRecord = await admin.auth().createUser({
        email: userData.email,
        password: userData.password,
        displayName: userData.displayName,
        emailVerified: true,
      });

      // Set custom claims
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        role: userData.role,
        companyId: userData.companyId || null,
      });

      // Create user document in Firestore
      await admin
        .firestore()
        .collection('users')
        .doc(userRecord.uid)
        .set({
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role,
          companyId: userData.companyId || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'active',
        });

      console.log(
        `✅ Created user: ${userData.email} with role: ${userData.role}`,
      );
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        console.log(`User ${userData.email} already exists`);
      } else {
        console.error(`Error creating user ${userData.email}:`, error);
      }
    }
  }

  console.log('\n✅ User creation complete!');
  console.log('\nLogin credentials:');
  console.log('Admin: admin@benefitschat.com / Admin123!@#');
  console.log('Employee: employee@benefitschat.com / Employee123!');
  process.exit(0);
}

createUsers().catch(console.error);
