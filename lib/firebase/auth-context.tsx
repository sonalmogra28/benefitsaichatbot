'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  Auth, 
  User, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { USER_ROLES, UserRole } from '@/lib/constants/roles';
import { adminDb } from './admin';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: UserRole | null;
  companyId: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    // Check for demo mode first
    const authMode = sessionStorage.getItem('authMode');
    const mockUserData = sessionStorage.getItem('mockUser');
    
    if (authMode === 'demo' && mockUserData) {
      try {
        const mockUser = JSON.parse(mockUserData);
        // Create a user-like object for demo mode
        const demoUser = {
          uid: mockUser.uid,
          email: mockUser.email,
          displayName: mockUser.displayName,
          emailVerified: mockUser.emailVerified,
          getIdTokenResult: async () => ({
            claims: {
              role: mockUser.role,
              companyId: mockUser.companyId,
            },
            token: `demo-token-${mockUser.uid}`,
            expirationTime: new Date(Date.now() + 3600000).toISOString(),
          }),
          getIdToken: async () => `demo-token-${mockUser.uid}`,
        } as any;
        
        setUser(demoUser);
        setRole(mockUser.role);
        setCompanyId(mockUser.companyId || null);
        setLoading(false);
        return;
      } catch (error) {
        console.error('Error loading demo user:', error);
      }
    }
    
    // Normal Firebase authentication
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Get user's custom claims from ID token
          const tokenResult = await user.getIdTokenResult();
          const userRole = (tokenResult.claims.role as UserRole) || USER_ROLES.EMPLOYEE;
          const userCompanyId = (tokenResult.claims.companyId as string) || null;
          
          setRole(userRole);
          setCompanyId(userCompanyId);
          setUser(user);
        } catch (error) {
          console.error('Error fetching user claims:', error);
          setUser(user);
          setRole(USER_ROLES.EMPLOYEE);
          setCompanyId(null);
        }
      } else {
        setUser(null);
        setRole(null);
        setCompanyId(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      // Additional logic can be added here if needed
    } catch (error: any) {
      console.error('Sign in error:', error);
      throw new Error(error.message || 'Failed to sign in');
    }
  };

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      const credential = await signInWithPopup(auth, provider);
      // Additional logic for first-time Google sign-ins
    } catch (error: any) {
      console.error('Google sign in error:', error);
      throw new Error(error.message || 'Failed to sign in with Google');
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name if provided
      if (displayName && credential.user) {
        await updateProfile(credential.user, { displayName });
      }
      
      // Send verification email
      if (credential.user) {
        await sendEmailVerification(credential.user);
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Failed to create account');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error('Logout error:', error);
      throw new Error(error.message || 'Failed to sign out');
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error('Password reset error:', error);
      throw new Error(error.message || 'Failed to send password reset email');
    }
  };

  const sendVerificationEmail = async () => {
    if (!user) throw new Error('No user logged in');
    try {
      await sendEmailVerification(user);
    } catch (error: any) {
      console.error('Verification email error:', error);
      throw new Error(error.message || 'Failed to send verification email');
    }
  };

  const updateUserProfile = async (displayName: string, photoURL?: string) => {
    if (!user) throw new Error('No user logged in');
    try {
      await updateProfile(user, { displayName, photoURL });
    } catch (error: any) {
      console.error('Profile update error:', error);
      throw new Error(error.message || 'Failed to update profile');
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    role,
    companyId,
    signIn,
    signInWithGoogle,
    signUp,
    logout,
    resetPassword,
    sendVerificationEmail,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Helper hook for checking authentication status
export const useRequireAuth = (redirectTo: string = '/login') => {
  const { user, loading } = useAuth();
  const router = typeof window !== 'undefined' ? require('next/navigation').useRouter() : null;

  useEffect(() => {
    if (!loading && !user && router) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  return { user, loading };
};

// Helper hook for role-based access
export const useRequireRole = (requiredRole: UserRole, redirectTo: string = '/unauthorized') => {
  const { user, role, loading } = useAuth();
  const router = typeof window !== 'undefined' ? require('next/navigation').useRouter() : null;

  useEffect(() => {
    if (!loading && router) {
      if (!user) {
        router.push('/login');
      } else if (role && !hasRoleAccess(role, requiredRole)) {
        router.push(redirectTo);
      }
    }
  }, [user, role, loading, router, requiredRole, redirectTo]);

  return { user, role, loading };
};

// Helper function to check role access
function hasRoleAccess(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    [USER_ROLES.SUPER_ADMIN]: 4,
    [USER_ROLES.PLATFORM_ADMIN]: 3,
    [USER_ROLES.COMPANY_ADMIN]: 2,
    [USER_ROLES.HR_ADMIN]: 1,
    [USER_ROLES.EMPLOYEE]: 0
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}