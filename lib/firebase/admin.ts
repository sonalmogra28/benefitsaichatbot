import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let app: App | undefined;

function initializeAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  try {
    // Check if the key is a valid JSON object before parsing
    if (serviceAccountKey && serviceAccountKey.trim().startsWith('{')) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      app = initializeApp({
        credential: cert(serviceAccount),
        databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      });
      console.log("Firebase Admin SDK initialized successfully using service account key.");
      return app;
    } else {
      if (serviceAccountKey) {
        // Log a warning if the key is present but not in the expected format
        console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is set but does not appear to be a valid JSON object. Falling back to Application Default Credentials.");
      }
      // Initialize with Application Default Credentials for GCP environments
      app = initializeApp();
      console.log("Initialized with Application Default Credentials.");
      return app;
    }
  } catch (error) {
    console.error("Critical: Firebase Admin SDK initialization failed.", error);
    // Fallback one last time in case of parsing errors
    if (!getApps().length) {
        console.log("Attempting final fallback to Application Default Credentials.");
        app = initializeApp();
        return app;
    }
    throw new Error("Could not initialize Firebase Admin SDK. Check server logs for details.");
  }
}

app = initializeAdminApp();

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export const adminStorage = getStorage(app);

// Export Firestore utilities
export { FieldValue, Timestamp };

// Also export with shorter names for backward compatibility
export const auth = adminAuth;
export const db = adminDb;
export const storage = adminStorage;
