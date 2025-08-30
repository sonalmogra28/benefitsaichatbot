// Development Firebase configuration with emulator support
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Development/Demo Firebase configuration
// These are public demo credentials - DO NOT use in production
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-benefits-assistant",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-benefits-assistant.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abc123",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Connect to emulators in development
if (process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  console.log('🔧 Using Firebase Emulators for development');
  
  try {
    // Only connect if not already connected
    if (!auth.emulatorConfig) {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    }
    // Use any cast to access internal properties for emulator check
    const dbAny = db as any;
    if (!dbAny._settings?.host?.includes('localhost')) {
      connectFirestoreEmulator(db, 'localhost', 8080);
    }
    const storageAny = storage as any;
    if (!storageAny._host?.includes('localhost')) {
      connectStorageEmulator(storage, 'localhost', 9199);
    }
  } catch (error) {
    console.log('Firebase emulators may already be connected or not running');
  }
}

export { app, auth, db, storage };