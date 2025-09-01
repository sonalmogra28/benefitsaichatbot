import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

if (!getApps().length) {
  try {
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string
    );
    initializeApp({
      credential: cert(serviceAccount),
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);
    // Prevent further execution if initialization fails
    throw new Error("Firebase Admin SDK initialization failed");
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
