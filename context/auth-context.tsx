''''use client';

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
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idToken }),
  });
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
        const idToken = await firebaseUser.getIdToken();
        await createSession(idToken);
        try {
          const idTokenResult = await getIdTokenResult(firebaseUser);
          setClaims(idTokenResult.claims);
        } catch (error) {
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
    switch (e.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        setError('Invalid email or password.');
        break;
      case 'auth/email-already-in-use':
        setError('Email already in use.');
        break;
      default:
        setError('An unexpected error occurred. Please try again.');
        break;
    }
  }

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
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
      await createUserWithEmailAndPassword(auth, email, pass);
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
      await signInWithPopup(auth, provider);
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
'''