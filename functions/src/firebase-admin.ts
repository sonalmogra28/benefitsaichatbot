
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();
const adminStorage = admin.storage();
const FieldValue = admin.firestore.FieldValue;

export { adminAuth, adminDb, adminStorage, FieldValue };
