// lib/firebase.ts
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Check if we have real Firebase credentials
const hasRealCredentials = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Use demo config if no real credentials are provided
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDemo123456789-demokey",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-benefits.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-benefits-assistant",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-benefits-assistant.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abc123def456",
};

// Initialize Firebase Client SDK
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Connect to emulators in development mode without real credentials
if (typeof window !== 'undefined' && !hasRealCredentials) {
  // Running in demo mode without Firebase credentials
  // To use real Firebase:
  // 1. Create a Firebase project
  // 2. Add Firebase config to .env.local
  // 3. Restart the development server
  
  // Note: In demo mode, authentication will use mock data
  // Real Firebase features will be limited
}

export { app, auth, db, storage };
