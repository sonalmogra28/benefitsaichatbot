import { getApps, initializeApp, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Initialize Firebase Admin
let adminApp: App;

if (!getApps().length) {
  try {
    // Try to use service account if available
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      });
    } else {
      // Fallback to default credentials (for local development)
      adminApp = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      });
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    // Initialize with project ID only as last resort
    adminApp = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'benefitschatbotac-383'
    });
  }
} else {
  adminApp = getApps()[0];
}

export const auth = getAuth(adminApp);
export const db = getFirestore(adminApp);
export const storage = getStorage(adminApp);
export { adminApp };

// Re-export from admin-sdk for backward compatibility
export * from './admin-sdk';
