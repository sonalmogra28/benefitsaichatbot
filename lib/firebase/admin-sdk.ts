import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import type { Storage } from 'firebase-admin/storage';

let adminAuth: Auth;
let adminDb: Firestore;
let adminStorage: Storage;

async function initializeFirebaseAdmin() {
  const admin = await import('firebase-admin');

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }

  adminAuth = admin.auth();
  adminDb = admin.firestore();
  adminStorage = admin.storage();
}

initializeFirebaseAdmin();

export { adminAuth, adminDb, adminStorage };
