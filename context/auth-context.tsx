'use client';

import React, {
  createContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { 
  User, 
  getIdTokenResult, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  GoogleAuthProvider, 
  signInWithPopup,
  onIdTokenChanged
} from 'firebase/auth';
import { auth } from '../lib/firebase'; 

interface AuthContextType {
  user: User | null;
  claims: { [key: string]: any } | null;
  loading: boolean;
  error: string | null;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  createUserWithEmail: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function createSession(idToken: string) {
  const response = await fetch('/api/auth/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idToken }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Session creation API error:', errorData);
    throw new Error(errorData.error || 'Failed to create session on server.');
  }
}

async function clearSession() {
  await fetch('/api/auth/session', {
    method: 'DELETE',
  });
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<{ [key: string]: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const idToken = await firebaseUser.getIdToken();
          await createSession(idToken);
          const idTokenResult = await getIdTokenResult(firebaseUser);
          setClaims(idTokenResult.claims);
        } catch (sessionError) {
          console.error('Error during session creation after sign-in:', sessionError);
          setError((sessionError as Error).message || 'Session setup failed. Please try again.');
          // Optionally sign out the user if session creation fails critically
          await firebaseSignOut(auth);
          setUser(null);
          setClaims(null);
        }
      } else {
        setUser(null);
        setClaims(null);
        await clearSession();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleError = (e: any) => {
    console.error('Authentication error:', e);
    switch (e.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        setError('Invalid email or password.');
        break;
      case 'auth/email-already-in-use':
        setError('Email already in use.');
        break;
      case 'auth/popup-blocked':
        setError('Popup blocked by browser. Please allow popups or try again.');
        break;
      case 'auth/invalid-credential':
        setError('Google Sign-in is not enabled or misconfigured. Please contact support.');
        break;
      case 'auth/operation-not-allowed':
        setError('Email/password sign-in is not enabled. Please contact support.');
        break;
      default:
        setError(e.message || 'An unexpected error occurred. Please try again.');
        break;
    }
  }

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      // Session creation is handled by onIdTokenChanged listener
    } catch (e: any) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  }

  const createUserWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      // Session creation is handled by onIdTokenChanged listener
    } catch (e: any) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  }

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSignOut(auth);
      // Session clearing is handled by onIdTokenChanged listener
    } catch (e: any) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  }

  const signInWithGoogle = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      // Session creation is handled by onIdTokenChanged listener
    } catch (e: any) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider value={{ user, claims, loading, error, signInWithEmail, createUserWithEmail, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};
