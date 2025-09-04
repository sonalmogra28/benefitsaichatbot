
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();
const db = admin.firestore();
const adminStorage = admin.storage();
const FieldValue = admin.firestore.FieldValue;
const Timestamp = admin.firestore.Timestamp;

export { adminAuth, adminDb, db, adminStorage, FieldValue, Timestamp };
