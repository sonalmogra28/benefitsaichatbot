// Mock authentication for development without Firebase
import { USER_ROLES } from '@/lib/constants/roles';

export interface MockUser {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  companyId?: string;
  emailVerified: boolean;
}

// Demo users for testing
export const DEMO_USERS: Record<string, MockUser & { password: string }> = {
  'employee@acme.com': {
    uid: 'demo-employee-001',
    email: 'employee@acme.com',
    displayName: 'John Employee',
    role: USER_ROLES.EMPLOYEE,
    companyId: 'acme-corp',
    emailVerified: true,
    password: 'TestPass123!'
  },
  'hradmin@acme.com': {
    uid: 'demo-hr-001',
    email: 'hradmin@acme.com',
    displayName: 'Jane HR Admin',
    role: USER_ROLES.HR_ADMIN,
    companyId: 'acme-corp',
    emailVerified: true,
    password: 'TestPass123!'
  },
  'companyadmin@acme.com': {
    uid: 'demo-company-001',
    email: 'companyadmin@acme.com',
    displayName: 'Bob Company Admin',
    role: USER_ROLES.COMPANY_ADMIN,
    companyId: 'acme-corp',
    emailVerified: true,
    password: 'TestPass123!'
  },
  'platformadmin@test.com': {
    uid: 'demo-platform-001',
    email: 'platformadmin@test.com',
    displayName: 'Alice Platform Admin',
    role: USER_ROLES.PLATFORM_ADMIN,
    emailVerified: true,
    password: 'TestPass123!'
  },
  'superadmin@test.com': {
    uid: 'demo-super-001',
    email: 'superadmin@test.com',
    displayName: 'Super Admin',
    role: USER_ROLES.SUPER_ADMIN,
    emailVerified: true,
    password: 'TestPass123!'
  }
};

export class MockAuthService {
  private currentUser: MockUser | null = null;

  async signInWithEmailAndPassword(email: string, password: string): Promise<MockUser> {
    const user = DEMO_USERS[email.toLowerCase()];
    
    if (!user) {
      throw new Error('auth/user-not-found');
    }
    
    if (user.password !== password) {
      throw new Error('auth/wrong-password');
    }
    
    this.currentUser = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      companyId: user.companyId,
      emailVerified: user.emailVerified
    };
    
    // Store in session storage for persistence
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mockUser', JSON.stringify(this.currentUser));
    }
    
    return this.currentUser;
  }

  async signOut(): Promise<void> {
    this.currentUser = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('mockUser');
    }
  }

  getCurrentUser(): MockUser | null {
    if (!this.currentUser && typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('mockUser');
      if (stored) {
        this.currentUser = JSON.parse(stored);
      }
    }
    return this.currentUser;
  }

  async getIdTokenResult() {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('No user logged in');
    }
    
    return {
      claims: {
        role: user.role,
        companyId: user.companyId,
        email: user.email,
        uid: user.uid
      },
      token: `mock-token-${user.uid}`,
      expirationTime: new Date(Date.now() + 3600000).toISOString()
    };
  }
}

export const mockAuth = new MockAuthService();