import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

if (!getApps().length) {
  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      initializeApp({
        credential: cert(serviceAccount),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      });
      console.log("Firebase Admin SDK initialized successfully using service account key.");
    } else {
      // This is intended for GCP-hosted environments like Cloud Functions, Cloud Run, App Engine.
      // It uses the runtime's default service account.
      initializeApp();
      console.log("FIREBASE_SERVICE_ACCOUNT_KEY not found. Initializing with Application Default Credentials.");
    }
  } catch (error) {
    console.error("Critical: Firebase Admin SDK initialization failed.", error);
    // Throw an error to fail fast if initialization is not possible.
    throw new Error("Could not initialize Firebase Admin SDK. Check server logs for details.");
  }
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
export const adminStorage = getStorage();

// Export Firestore utilities
export { FieldValue, Timestamp };

// Also export with shorter names for backward compatibility
export const auth = adminAuth;
export const db = adminDb;
export const storage = adminStorage;
