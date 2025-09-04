// lib/firebase/client.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// In development, connect to the Firebase Emulators
if (process.env.NODE_ENV === 'development') {
  // Check if the emulators are running by seeing if the host variables are set
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
  }
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    connectFirestoreEmulator(db, process.env.FIRESTORE_EMULATOR_HOST.split(':')[0], parseInt(process.env.FIRESTORE_EMULATOR_HOST.split(':')[1]));
  }
  if (process.env.FIREBASE_STORAGE_EMULATOR_HOST) {
    const host = process.env.FIREBASE_STORAGE_EMULATOR_HOST.split(':')[0];
    const port = parseInt(process.env.FIREBASE_STORAGE_EMULATOR_HOST.split(':')[1]);
    connectStorageEmulator(storage, host, port);
  }
}

export { app, auth, db, storage };
