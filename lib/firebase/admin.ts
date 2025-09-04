// lib/firebase/admin.ts
import admin from 'firebase-admin';

// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  // When running in a Google Cloud environment or with a service account file,
  // the SDK can initialize automatically.
  // For local development with emulators, the FIREBASE_AUTH_EMULATOR_HOST
  // environment variable will be set, and the SDK will connect to the emulator.
  admin.initializeApp();
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();
const db = admin.firestore(); // alias for adminDb
const adminStorage = admin.storage();
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

export { adminAuth, adminDb, db, adminStorage, FieldValue, Timestamp };
