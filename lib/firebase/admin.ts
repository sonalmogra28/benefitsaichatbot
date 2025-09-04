import admin from 'firebase-admin';
import { FIREBASE_ADMIN_CONFIG } from '@/lib/config/env.server';

const initializeAdminApp = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // When emulators are running, the Admin SDK can connect without credentials.
  const isEmulator = 
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    process.env.FIREBASE_STORAGE_EMULATOR_HOST;

  if (isEmulator) {
    console.log('Firebase Emulators detected. Initializing Admin SDK without credentials.');
    return admin.initializeApp({
      // Using a static project ID is fine for emulators.
      projectId: 'benefitschatbotac-383', 
    });
  }

  // For production or environments without emulators, a service account is required.
  if (!FIREBASE_ADMIN_CONFIG.serviceAccount) {
    console.error('Firebase Admin SDK initialization failed.');
    console.error('Service account credentials are not configured.');
    console.error('To fix this, you have two options:');
    console.error('1. Provide credentials in a .env.local file (see .env.example).');
    console.error('2. For local development, run the Firebase Emulators with `firebase emulators:start`.');
    throw new Error('Firebase service account not found. Check server logs for details.');
  }

  return admin.initializeApp({
    credential: admin.credential.cert(FIREBASE_ADMIN_CONFIG.serviceAccount),
    databaseURL: FIREBASE_ADMIN_CONFIG.databaseURL,
  });
};

const adminApp = initializeAdminApp();

export const adminAuth = adminApp.auth();
export const adminDb = adminApp.firestore();
export const db = adminApp.firestore(); // alias for adminDb
export const adminStorage = adminApp.storage();

export const { FieldValue, Timestamp } = admin.firestore;
