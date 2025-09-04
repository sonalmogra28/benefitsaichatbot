import admin from 'firebase-admin';

// Initialize the Admin SDK once in the Cloud Functions environment
if (!admin.apps.length) {
  admin.initializeApp();
}

const adminDb = admin.firestore();
const adminStorage = admin.storage();

export { adminDb, adminStorage };
