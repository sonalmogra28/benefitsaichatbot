# 🚀 Firebase Migration Plan - Benefits Assistant Chatbot
**Version**: 1.0  
**Date**: January 2025  
**Status**: Ready for Execution  
**Data Migration Required**: None (greenfield deployment)

---

## 📋 Table of Contents
1. [Migration Overview](#migration-overview)
2. [Pre-Migration Checklist](#pre-migration-checklist)
3. [Phase 1: Firebase Project Setup](#phase-1-firebase-project-setup)
4. [Phase 2: Authentication Migration](#phase-2-authentication-migration)
5. [Phase 3: Database Migration](#phase-3-database-migration)
6. [Phase 4: Storage & Functions Setup](#phase-4-storage--functions-setup)
7. [Phase 5: AI Integration with Vertex AI](#phase-5-ai-integration-with-vertex-ai)
8. [Phase 6: Code Cleanup & Optimization](#phase-6-code-cleanup--optimization)
9. [Phase 7: Testing & Validation](#phase-7-testing--validation)
10. [Phase 8: Deployment](#phase-8-deployment)
11. [Post-Migration Tasks](#post-migration-tasks)
12. [Rollback Plan](#rollback-plan)

---

## 🎯 Migration Overview

### Current State
- **Database**: PostgreSQL (Neon)
- **Auth**: Stack Auth
- **Storage**: Mixed (GCS partial implementation)
- **AI**: Mixed providers (OpenAI, Anthropic, Google)
- **Deployment**: Vercel
- **Users/Data**: None (fresh start)

### Target State
- **Database**: Firestore
- **Auth**: Firebase Authentication
- **Storage**: Firebase Cloud Storage
- **AI**: Vertex AI (Google Gemini)
- **Functions**: Firebase Cloud Functions
- **Deployment**: Firebase Hosting + Cloud Run
- **Monitoring**: Firebase Performance & Crashlytics

### Migration Benefits
- ✅ Unified Google Cloud ecosystem
- ✅ Reduced complexity and vendors
- ✅ Better integration and performance
- ✅ Lower operational costs
- ✅ Enhanced security with Firebase rules
- ✅ Real-time capabilities built-in

---

## ✅ Pre-Migration Checklist

### Environment Preparation
- [ ] Create new Google Cloud Project
- [ ] Enable required APIs (Firebase, Vertex AI, Cloud Run)
- [ ] Set up billing account
- [ ] Configure IAM roles and service accounts
- [ ] Install Firebase CLI: `npm install -g firebase-tools`
- [ ] Install Google Cloud SDK: `gcloud auth login`

### Code Preparation (COMPLETED ✅)
- [x] Security audit completed
- [x] Critical vulnerabilities fixed
- [x] Authentication system prepared
- [x] Role standardization implemented
- [x] Firebase rules created
- [x] Rate limiting implemented

### Documentation
- [ ] Update README.md
- [ ] Create deployment guides
- [ ] Document API changes
- [ ] Update environment variables list

---

## 📦 Phase 1: Firebase Project Setup
**Timeline**: 2 hours  
**Risk Level**: Low

### 1.1 Create Firebase Project
```bash
# Initialize Firebase project
firebase init

# Select features:
# - Firestore
# - Functions
# - Hosting
# - Storage
# - Emulators
```

### 1.2 Configure Firebase Project
```javascript
// firebase.json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs20",
    "region": "us-central1"
  },
  "hosting": {
    "public": ".next",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "run": {
          "serviceId": "benefitschatbot",
          "region": "us-central1"
        }
      }
    ]
  },
  "storage": {
    "rules": "storage.rules"
  },
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "hosting": { "port": 5000 },
    "storage": { "port": 9199 }
  }
}
```

### 1.3 Environment Variables Setup
```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# .env.production
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_PRIVATE_KEY=
FIREBASE_ADMIN_CLIENT_EMAIL=
GOOGLE_APPLICATION_CREDENTIALS=
VERTEX_AI_PROJECT_ID=
VERTEX_AI_LOCATION=us-central1
```

### Deliverables
- ✅ Firebase project created and configured
- ✅ firebase.json configuration file
- ✅ Environment variables configured
- ✅ Local emulators running

---

## 🔐 Phase 2: Authentication Migration
**Timeline**: 4 hours  
**Risk Level**: Medium

### 2.1 Remove Stack Auth Dependencies
```bash
# Remove Stack Auth packages
npm uninstall @stackframe/stack @stackframe/stack-shared

# Remove Stack Auth files
rm -rf lib/stack-auth/
rm -rf app/api/auth/stack/
```

### 2.2 Update Authentication Provider
```typescript
// lib/firebase/auth-context.tsx
import { createContext, useContext, useEffect, useState } from 'react';
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
  sendEmailVerification
} from 'firebase/auth';
import { auth } from './firebase';
import { USER_ROLES } from '@/lib/constants/roles';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: string | null;
  companyId: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdTokenResult();
        setRole(token.claims.role as string || USER_ROLES.EMPLOYEE);
        setCompanyId(token.claims.companyId as string || null);
        setUser(user);
      } else {
        setUser(null);
        setRole(null);
        setCompanyId(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Auth methods implementation...
  
  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      role, 
      companyId,
      signIn,
      signInWithGoogle,
      signUp,
      logout,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### 2.3 Update Login/Register Pages
```typescript
// app/(auth)/login/page.tsx
'use client';
import { useAuth } from '@/lib/firebase/auth-context';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { signIn, signInWithGoogle } = useAuth();
  const router = useRouter();
  
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
  
  // Component implementation...
}
```

### Deliverables
- ✅ Stack Auth completely removed
- ✅ Firebase Auth context provider
- ✅ Updated login/register flows
- ✅ Social auth (Google) configured
- ✅ Password reset functionality

---

## 🗄️ Phase 3: Database Migration
**Timeline**: 6 hours  
**Risk Level**: High

### 3.1 Remove PostgreSQL/Drizzle
```bash
# Remove database packages
npm uninstall drizzle-orm @neondatabase/serverless pg

# Remove database files
rm -rf lib/db/
rm -rf drizzle/
rm drizzle.config.ts
```

### 3.2 Create Firestore Data Models
```typescript
// lib/firebase/models.ts
import { Timestamp } from 'firebase/firestore';

export interface Company {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'inactive' | 'trial';
  employeeCount: number;
  subscription: {
    plan: 'starter' | 'professional' | 'enterprise';
    status: 'active' | 'cancelled' | 'past_due';
    currentPeriodEnd: Timestamp;
  };
  settings: {
    allowedEmailDomains: string[];
    requireEmailVerification: boolean;
    defaultRole: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: string;
  companyId: string;
  department?: string;
  hireDate?: Timestamp;
  status: 'active' | 'inactive' | 'pending';
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    location?: string;
  };
  preferences: {
    notifications: boolean;
    theme: 'light' | 'dark' | 'system';
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
}

export interface BenefitPlan {
  id: string;
  companyId: string;
  name: string;
  type: 'health' | 'dental' | 'vision' | '401k' | 'life' | 'disability';
  provider: string;
  description: string;
  coverage: {
    employeeOnly: number;
    employeeSpouse: number;
    employeeFamily: number;
  };
  deductible: number;
  outOfPocketMax: number;
  features: string[];
  documents: string[];
  effectiveDate: Timestamp;
  enrollmentDeadline: Timestamp;
  status: 'active' | 'upcoming' | 'expired';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Conversation {
  id: string;
  userId: string;
  companyId: string;
  title: string;
  status: 'active' | 'archived';
  metadata: {
    tokensUsed: number;
    model: string;
    lastMessageAt: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    processingTime?: number;
    tools?: string[];
  };
  createdAt: Timestamp;
}
```

### 3.3 Create Firestore Service Layer
```typescript
// lib/firebase/firestore-service.ts
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';

export class FirestoreService {
  // Companies
  async createCompany(data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) {
    const companyRef = doc(collection(db, 'companies'));
    const company = {
      ...data,
      id: companyRef.id,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    await setDoc(companyRef, company);
    return company;
  }

  async getCompany(companyId: string) {
    const docRef = doc(db, 'companies', companyId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() as Company : null;
  }

  // Users
  async createUser(data: Omit<User, 'createdAt' | 'updatedAt'>) {
    const userRef = doc(db, 'users', data.uid);
    const user = {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    await setDoc(userRef, user);
    return user;
  }

  async getUsersByCompany(companyId: string) {
    const q = query(
      collection(db, 'users'),
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as User);
  }

  // Benefits
  async getBenefitPlans(companyId: string) {
    const q = query(
      collection(db, 'companies', companyId, 'benefitPlans'),
      where('status', '==', 'active'),
      orderBy('type')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BenefitPlan));
  }

  // Conversations
  async createConversation(userId: string, companyId: string, title: string) {
    const convRef = doc(collection(db, 'companies', companyId, 'conversations'));
    const conversation = {
      id: convRef.id,
      userId,
      companyId,
      title,
      status: 'active',
      metadata: {
        tokensUsed: 0,
        model: 'gemini-2.0-flash-exp',
        lastMessageAt: Timestamp.now()
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    await setDoc(convRef, conversation);
    return conversation;
  }

  // Real-time listeners
  subscribeToConversation(
    companyId: string, 
    conversationId: string, 
    callback: (messages: Message[]) => void
  ) {
    const q = query(
      collection(db, 'companies', companyId, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      callback(messages);
    });
  }
}

export const firestoreService = new FirestoreService();
```

### 3.4 Update API Routes
```typescript
// app/api/companies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { firestoreService } from '@/lib/firebase/firestore-service';

export const GET = requireAuth(async (req, user) => {
  const companies = await firestoreService.getUserCompanies(user.uid);
  return NextResponse.json(companies);
});

export const POST = requireAuth(async (req, user) => {
  const data = await req.json();
  const company = await firestoreService.createCompany({
    ...data,
    createdBy: user.uid
  });
  return NextResponse.json(company);
});
```

### Deliverables
- ✅ PostgreSQL/Drizzle completely removed
- ✅ Firestore data models defined
- ✅ Firestore service layer implemented
- ✅ API routes updated to use Firestore
- ✅ Real-time subscriptions configured

---

## ☁️ Phase 4: Storage & Functions Setup
**Timeline**: 4 hours  
**Risk Level**: Medium

### 4.1 Configure Firebase Storage
```typescript
// lib/firebase/storage-service.ts
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  listAll
} from 'firebase/storage';
import { storage } from './firebase';

export class StorageService {
  async uploadDocument(
    companyId: string,
    userId: string,
    file: File,
    metadata?: Record<string, string>
  ) {
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const path = `companies/${companyId}/documents/${userId}/${fileName}`;
    
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file, {
      customMetadata: {
        uploadedBy: userId,
        originalName: file.name,
        ...metadata
      }
    });
    
    const downloadURL = await getDownloadURL(snapshot.ref);
    return { path, downloadURL, size: file.size };
  }

  async getCompanyDocuments(companyId: string) {
    const listRef = ref(storage, `companies/${companyId}/documents`);
    const result = await listAll(listRef);
    
    const documents = await Promise.all(
      result.items.map(async (item) => {
        const url = await getDownloadURL(item);
        return {
          name: item.name,
          path: item.fullPath,
          url
        };
      })
    );
    
    return documents;
  }

  async deleteDocument(path: string) {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  }
}

export const storageService = new StorageService();
```

### 4.2 Create Cloud Functions
```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// User creation trigger
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  // Create user profile document
  await admin.firestore().collection('users').doc(user.uid).set({
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    role: 'employee',
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  // Send welcome email
  await admin.firestore().collection('pending_emails').add({
    to: user.email,
    template: 'welcome',
    data: {
      displayName: user.displayName || 'User'
    }
  });
});

// Document processing
export const processDocument = functions.storage
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name;
    if (!filePath?.includes('/documents/')) return;
    
    // Extract company and user ID from path
    const pathParts = filePath.split('/');
    const companyId = pathParts[1];
    const userId = pathParts[3];
    
    // Process document (OCR, metadata extraction, etc.)
    // This would integrate with Document AI
    
    // Update Firestore with document metadata
    await admin.firestore()
      .collection('companies')
      .doc(companyId)
      .collection('documents')
      .add({
        path: filePath,
        size: object.size,
        contentType: object.contentType,
        uploadedBy: userId,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'processed'
      });
  });

// Scheduled cleanup
export const cleanupOldSessions = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days
    
    const batch = admin.firestore().batch();
    const oldSessions = await admin.firestore()
      .collection('sessions')
      .where('lastAccessedAt', '<', cutoff)
      .get();
    
    oldSessions.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Deleted ${oldSessions.size} old sessions`);
  });
```

### Deliverables
- ✅ Firebase Storage service implemented
- ✅ Cloud Functions for user lifecycle
- ✅ Document processing pipeline
- ✅ Scheduled maintenance functions
- ✅ Email queue system

---

## 🤖 Phase 5: AI Integration with Vertex AI
**Timeline**: 6 hours  
**Risk Level**: Medium

### 5.1 Remove Legacy AI Providers
```bash
# Remove old AI packages
npm uninstall openai @anthropic-ai/sdk

# Keep only Google AI SDK
npm install @google-cloud/vertexai
```

### 5.2 Configure Vertex AI
```typescript
// lib/ai/vertex-ai-service.ts
import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';

const vertexAI = new VertexAI({
  project: process.env.VERTEX_AI_PROJECT_ID!,
  location: process.env.VERTEX_AI_LOCATION || 'us-central1'
});

const model = vertexAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  generationConfig: {
    maxOutputTokens: 8192,
    temperature: 0.7,
    topP: 0.95,
  },
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    }
  ]
});

export class VertexAIService {
  async generateResponse(
    prompt: string,
    context?: {
      companyId: string;
      userId: string;
      benefitPlans?: any[];
    }
  ) {
    // Build context-aware prompt
    const systemPrompt = `You are a helpful benefits assistant for ${context?.companyId || 'the company'}.
    You have access to the following benefit plans: ${JSON.stringify(context?.benefitPlans || [])}
    Provide accurate, helpful information about employee benefits.`;
    
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: systemPrompt }]
        }
      ]
    });
    
    const result = await chat.sendMessage(prompt);
    return result.response.text();
  }

  async generateEmbedding(text: string) {
    const embeddingModel = vertexAI.getGenerativeModel({
      model: 'text-embedding-004'
    });
    
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  }

  async streamResponse(
    prompt: string,
    onChunk: (text: string) => void
  ) {
    const chat = model.startChat();
    const streamingResult = await chat.sendMessageStream(prompt);
    
    for await (const chunk of streamingResult.stream) {
      onChunk(chunk.text());
    }
  }
}

export const vertexAIService = new VertexAIService();
```

### 5.3 Update Chat API
```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { vertexAIService } from '@/lib/ai/vertex-ai-service';
import { firestoreService } from '@/lib/firebase/firestore-service';

export const POST = requireAuth(async (req, user) => {
  const { message, conversationId } = await req.json();
  
  // Get user's company benefits for context
  const benefitPlans = await firestoreService.getBenefitPlans(user.companyId);
  
  // Generate AI response
  const response = await vertexAIService.generateResponse(message, {
    companyId: user.companyId,
    userId: user.uid,
    benefitPlans
  });
  
  // Save to conversation
  await firestoreService.addMessage(user.companyId, conversationId, {
    role: 'user',
    content: message,
    userId: user.uid
  });
  
  await firestoreService.addMessage(user.companyId, conversationId, {
    role: 'assistant',
    content: response,
    metadata: {
      model: 'gemini-2.0-flash-exp',
      tokensUsed: response.length / 4 // Approximate
    }
  });
  
  return NextResponse.json({ response });
});
```

### Deliverables
- ✅ Legacy AI providers removed
- ✅ Vertex AI configured
- ✅ Chat API using Gemini models
- ✅ Embedding generation for RAG
- ✅ Streaming responses implemented

---

## 🧹 Phase 6: Code Cleanup & Optimization
**Timeline**: 4 hours  
**Risk Level**: Low

### 6.1 Remove Console Logs
```bash
# Create logging service
touch lib/utils/logger.ts
```

```typescript
// lib/utils/logger.ts
const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args: any[]) => {
    if (isDevelopment) console.log('[DEBUG]', ...args);
  },
  info: (...args: any[]) => {
    if (isDevelopment) console.info('[INFO]', ...args);
  },
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
    // Send to error tracking service in production
  }
};
```

```bash
# Replace console.log statements
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/console\.log/logger.debug/g' {} \;
find . -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/console\.error/logger.error/g' {} \;
```

### 6.2 Fix TypeScript Any Types
```typescript
// Create type definitions
// lib/types/index.ts
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];
export type ApiResponse<T> = { data: T; error?: never } | { data?: never; error: string };
export type AsyncFunction<T = void> = () => Promise<T>;
export type EventHandler<T = void> = (event: Event) => T;
```

### 6.3 Remove Unused Dependencies
```bash
# Analyze and remove unused packages
npx depcheck

# Remove identified unused packages
npm uninstall [unused-packages]

# Update remaining packages
npm update
```

### Deliverables
- ✅ Console statements replaced with logger
- ✅ TypeScript any types fixed
- ✅ Unused dependencies removed
- ✅ Code formatting standardized
- ✅ Build optimization configured

---

## ✅ Phase 7: Testing & Validation
**Timeline**: 8 hours  
**Risk Level**: High

### 7.1 Unit Tests
```typescript
// __tests__/auth.test.ts
import { describe, it, expect } from 'vitest';
import { hasRoleAccess, USER_ROLES } from '@/lib/constants/roles';

describe('Authentication', () => {
  it('should validate role hierarchy', () => {
    expect(hasRoleAccess(USER_ROLES.SUPER_ADMIN, USER_ROLES.EMPLOYEE)).toBe(true);
    expect(hasRoleAccess(USER_ROLES.EMPLOYEE, USER_ROLES.SUPER_ADMIN)).toBe(false);
  });
});
```

### 7.2 Integration Tests
```typescript
// __tests__/api/companies.test.ts
import { describe, it, expect } from 'vitest';
import { GET } from '@/app/api/companies/route';

describe('Companies API', () => {
  it('should require authentication', async () => {
    const req = new Request('http://localhost/api/companies');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
```

### 7.3 E2E Tests
```typescript
// e2e/auth-flow.spec.ts
import { test, expect } from '@playwright/test';

test('user can sign up and login', async ({ page }) => {
  await page.goto('/register');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'TestPassword123!');
  await page.click('[type=submit]');
  
  await expect(page).toHaveURL('/dashboard');
});
```

### 7.4 Security Testing
```bash
# Run security audit
npm audit

# Test Firebase rules
firebase emulators:exec --only firestore,storage "npm test"

# Load testing
artillery quick --count 50 --num 100 https://localhost:3000/api/health
```

### Test Checklist
- [ ] Authentication flows work
- [ ] Role-based access control enforced
- [ ] File uploads validated
- [ ] Rate limiting functional
- [ ] Firebase rules restrictive
- [ ] API endpoints secure
- [ ] Error handling graceful
- [ ] Performance acceptable

### Deliverables
- ✅ Unit test coverage > 70%
- ✅ Integration tests passing
- ✅ E2E tests for critical paths
- ✅ Security tests passing
- ✅ Performance benchmarks met

---

## 🚀 Phase 8: Deployment
**Timeline**: 4 hours  
**Risk Level**: High

### 8.1 Build and Containerize
```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
ENV PORT 3000
ENV NODE_ENV production

CMD ["node", "server.js"]
```

### 8.2 Deploy to Cloud Run
```bash
# Build and push container
gcloud builds submit --tag gcr.io/PROJECT_ID/benefitschatbot

# Deploy to Cloud Run
gcloud run deploy benefitschatbot \
  --image gcr.io/PROJECT_ID/benefitschatbot \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NEXT_PUBLIC_FIREBASE_PROJECT_ID=..." \
  --min-instances=1 \
  --max-instances=100
```

### 8.3 Configure Firebase Hosting
```bash
# Deploy Firebase services
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
firebase deploy --only functions
firebase deploy --only hosting
```

### 8.4 DNS and SSL Setup
```bash
# Add custom domain
firebase hosting:sites:create benefitschatbot
firebase target:apply hosting benefitschatbot benefitschatbot
gcloud domains verify YOUR_DOMAIN
```

### Deployment Checklist
- [ ] Environment variables configured
- [ ] Firebase rules deployed
- [ ] Cloud Functions deployed
- [ ] Container built and pushed
- [ ] Cloud Run service deployed
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Monitoring configured

### Deliverables
- ✅ Production deployment live
- ✅ Custom domain configured
- ✅ SSL/HTTPS enabled
- ✅ Auto-scaling configured
- ✅ Monitoring dashboards created

---

## 📋 Post-Migration Tasks
**Timeline**: 2 hours  
**Risk Level**: Low

### Monitoring Setup
```bash
# Enable Firebase Performance Monitoring
firebase performance:monitoring:enable

# Configure alerts
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="High Error Rate" \
  --condition-display-name="Error rate > 1%" 
```

### Documentation Updates
- [ ] Update README.md with Firebase setup
- [ ] Create operations runbook
- [ ] Document emergency procedures
- [ ] Update API documentation
- [ ] Create user guides

### Training & Handover
- [ ] Team training on Firebase Console
- [ ] Document common operations
- [ ] Create troubleshooting guide
- [ ] Establish support procedures

---

## 🔄 Rollback Plan

### Rollback Triggers
- Critical bug in production
- Performance degradation > 50%
- Security breach detected
- Data corruption issues

### Rollback Procedure
1. **Immediate Actions** (5 minutes)
   ```bash
   # Revert Cloud Run to previous version
   gcloud run services update-traffic benefitschatbot \
     --to-revisions=PREVIOUS_REVISION=100
   ```

2. **Communication** (10 minutes)
   - Notify stakeholders
   - Update status page
   - Log incident details

3. **Investigation** (30 minutes)
   - Analyze error logs
   - Identify root cause
   - Plan fix implementation

4. **Recovery** (2 hours)
   - Fix identified issues
   - Test thoroughly
   - Prepare new deployment

### Rollback Checklist
- [ ] Previous version accessible
- [ ] Database backups available
- [ ] Rollback scripts tested
- [ ] Communication plan ready
- [ ] Recovery time < 4 hours

---

## 📊 Success Metrics

### Technical Metrics
- ✅ Zero data loss during migration
- ✅ API response time < 200ms (p95)
- ✅ Error rate < 0.1%
- ✅ Uptime > 99.9%
- ✅ Build time < 5 minutes

### Business Metrics
- ✅ User authentication working
- ✅ All features functional
- ✅ No service interruption
- ✅ Cost reduction > 30%
- ✅ Performance improvement > 20%

### Security Metrics
- ✅ All vulnerabilities patched
- ✅ Security headers implemented
- ✅ Rate limiting active
- ✅ Firebase rules enforced
- ✅ Audit logging enabled

---

## 📝 Migration Timeline Summary

| Phase | Duration | Status | Risk |
|-------|----------|--------|------|
| Phase 1: Firebase Setup | 2 hours | Ready | Low |
| Phase 2: Auth Migration | 4 hours | Ready | Medium |
| Phase 3: Database Migration | 6 hours | Ready | High |
| Phase 4: Storage & Functions | 4 hours | Ready | Medium |
| Phase 5: AI Integration | 6 hours | Ready | Medium |
| Phase 6: Code Cleanup | 4 hours | Ready | Low |
| Phase 7: Testing | 8 hours | Ready | High |
| Phase 8: Deployment | 4 hours | Ready | High |
| **Total** | **38 hours** | **Ready** | **Medium** |

---

## 🎯 Final Deliverables

### Code Deliverables
1. ✅ Complete Firebase integration
2. ✅ Removed all PostgreSQL/Stack Auth code
3. ✅ Vertex AI implementation
4. ✅ Security enhancements implemented
5. ✅ Test suite with >70% coverage

### Infrastructure Deliverables
1. ✅ Firebase project configured
2. ✅ Cloud Run deployment
3. ✅ Cloud Functions deployed
4. ✅ Security rules active
5. ✅ Monitoring configured

### Documentation Deliverables
1. ✅ Migration plan (this document)
2. ✅ Updated README.md
3. ✅ API documentation
4. ✅ Operations runbook
5. ✅ Troubleshooting guide

### Security Deliverables
1. ✅ All critical vulnerabilities fixed
2. ✅ Firebase rules implemented
3. ✅ Rate limiting active
4. ✅ Audit logging enabled
5. ✅ Security headers configured

---

## ✅ Sign-Off Checklist

### Pre-Migration
- [ ] Stakeholder approval obtained
- [ ] Backup plan confirmed
- [ ] Team briefed on procedure
- [ ] Monitoring tools ready
- [ ] Rollback plan tested

### Post-Migration
- [ ] All tests passing
- [ ] Performance validated
- [ ] Security scan clean
- [ ] Documentation updated
- [ ] Team trained

### Final Approval
- [ ] Technical Lead: _____________
- [ ] Project Manager: _____________
- [ ] Security Officer: _____________
- [ ] Product Owner: _____________
- [ ] Date: _____________

---

**Migration Plan Version**: 1.0  
**Created**: January 2025  
**Status**: Ready for Execution  
**Estimated Duration**: 38 hours (5 working days)  
**Risk Level**: Medium (mitigated through phased approach)

---

## 🚨 Emergency Contacts

- **Firebase Support**: https://firebase.google.com/support
- **Google Cloud Support**: 1-877-355-5787
- **Technical Lead**: [Contact Info]
- **On-Call Engineer**: [Contact Info]

---

## 📊 MIGRATION PROGRESS TRACKER

### ✅ Completed Phases (As of January 2025)

#### Phase 1: Firebase Project Setup ✅
- Created `firebase.json` configuration
- Created `firestore.indexes.json` with composite indexes
- Created `.firebaserc` project configuration
- Configured emulator settings
- **Status**: COMPLETE

#### Phase 2: Authentication Migration ✅
- Removed Stack Auth packages
- Created Firebase Auth context (`/lib/firebase/auth-context.tsx`)
- Implemented authentication hooks
- Added role-based access helpers
- **Status**: COMPLETE

#### Phase 3: Database Migration ✅
- Created Firestore data models (`/lib/firebase/models.ts`)
- Implemented Firestore service layer (`/lib/firebase/firestore-service.ts`)
- Defined all entity interfaces
- Created service classes for all collections
- **Status**: COMPLETE

### 🔄 In Progress

#### Phase 4: Storage & Functions Setup
- Next: Create Cloud Functions structure
- Next: Implement document processing
- Next: Set up scheduled functions

### 📋 Remaining Phases

- Phase 5: Vertex AI Integration
- Phase 6: Code Cleanup
- Phase 7: Testing
- Phase 8: Deployment

### 📈 Overall Progress: 37.5% Complete (3/8 Phases)

---

**END OF MIGRATION PLAN**