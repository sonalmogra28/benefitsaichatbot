# 🚀 Cloud Functions & Vertex AI Implementation Plan
**Project**: Benefits Assistant Chatbot  
**Phases**: 4 & 5 of Firebase Migration  
**Estimated Time**: 10 hours total

---

## 📋 Phase 4: Cloud Functions & Storage Implementation
**Timeline**: 4 hours  
**Risk Level**: Medium

### 🎯 Objectives
- Implement document processing pipeline
- Create user lifecycle functions
- Set up scheduled maintenance tasks
- Integrate Cloud Storage for documents
- Implement email queue system

### 📦 Deliverables

#### 4.1 Cloud Functions Structure Setup
**Time**: 30 minutes

```bash
# Create functions directory structure
functions/
├── src/
│   ├── index.ts              # Main entry point
│   ├── config/
│   │   └── firebase.ts        # Admin SDK initialization
│   ├── triggers/
│   │   ├── auth.ts           # Auth event triggers
│   │   ├── firestore.ts      # Database triggers
│   │   ├── storage.ts        # Storage triggers
│   │   └── scheduled.ts      # Cron jobs
│   ├── services/
│   │   ├── email.ts          # Email service
│   │   ├── document.ts       # Document processing
│   │   └── analytics.ts      # Analytics aggregation
│   ├── utils/
│   │   ├── logger.ts         # Structured logging
│   │   └── errors.ts         # Error handling
│   └── types/
│       └── index.ts          # Shared types
├── test/
├── package.json
├── tsconfig.json
└── .env.example
```

**Implementation**:
```typescript
// functions/src/index.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Admin SDK
admin.initializeApp();

// Export all triggers
export * from './triggers/auth';
export * from './triggers/firestore';
export * from './triggers/storage';
export * from './triggers/scheduled';
```

#### 4.2 User Lifecycle Functions
**Time**: 45 minutes

```typescript
// functions/src/triggers/auth.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { UserRecord } from 'firebase-admin/auth';
import { logger } from '../utils/logger';

/**
 * Trigger: User account creation
 * Actions:
 * - Create user profile document
 * - Send welcome email
 * - Initialize user preferences
 * - Log audit event
 */
export const onUserCreated = functions
  .region('us-central1')
  .auth.user()
  .onCreate(async (user: UserRecord) => {
    try {
      logger.info('User created', { uid: user.uid, email: user.email });
      
      // Create user profile in Firestore
      const userProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        role: 'employee', // Default role
        status: 'pending',
        emailVerified: false,
        profile: {
          firstName: '',
          lastName: '',
        },
        preferences: {
          notifications: {
            email: true,
            push: true,
            sms: false
          },
          theme: 'system',
          language: 'en',
          timezone: 'America/New_York'
        },
        metadata: {
          loginCount: 0,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await admin.firestore()
        .collection('users')
        .doc(user.uid)
        .set(userProfile);
      
      // Queue welcome email
      await admin.firestore()
        .collection('email_queue')
        .add({
          to: user.email,
          template: 'welcome',
          data: {
            displayName: user.displayName || 'User',
            verificationLink: await admin.auth()
              .generateEmailVerificationLink(user.email!)
          },
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      
      // Log audit event
      await admin.firestore()
        .collection('audit_logs')
        .add({
          action: 'user.created',
          userId: user.uid,
          userEmail: user.email,
          category: 'auth',
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      
      logger.info('User setup completed', { uid: user.uid });
    } catch (error) {
      logger.error('User creation handler failed', { error, uid: user.uid });
      throw error;
    }
  });

/**
 * Trigger: User account deletion
 * Actions:
 * - Anonymize user data
 * - Cancel subscriptions
 * - Archive conversations
 * - Log audit event
 */
export const onUserDeleted = functions
  .region('us-central1')
  .auth.user()
  .onDelete(async (user: UserRecord) => {
    try {
      logger.info('User deleted', { uid: user.uid });
      
      const batch = admin.firestore().batch();
      
      // Anonymize user profile
      const userRef = admin.firestore().collection('users').doc(user.uid);
      batch.update(userRef, {
        email: 'deleted@anonymous.com',
        displayName: 'Deleted User',
        status: 'deleted',
        deletedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Archive user's conversations
      const conversations = await admin.firestore()
        .collectionGroup('conversations')
        .where('userId', '==', user.uid)
        .get();
      
      conversations.forEach(doc => {
        batch.update(doc.ref, {
          status: 'archived',
          archivedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });
      
      await batch.commit();
      
      logger.info('User deletion completed', { uid: user.uid });
    } catch (error) {
      logger.error('User deletion handler failed', { error, uid: user.uid });
    }
  });
```

#### 4.3 Document Processing Pipeline
**Time**: 1 hour

```typescript
// functions/src/triggers/storage.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';
import { processDocument } from '../services/document';

/**
 * Trigger: Document upload to Cloud Storage
 * Actions:
 * - Extract metadata
 * - Generate thumbnails (if image)
 * - Extract text (OCR/parsing)
 * - Generate embeddings
 * - Update Firestore
 */
export const onDocumentUploaded = functions
  .region('us-central1')
  .storage.object()
  .onFinalize(async (object) => {
    try {
      const filePath = object.name;
      const contentType = object.contentType;
      
      // Only process documents in the documents folder
      if (!filePath?.startsWith('companies/') || !filePath.includes('/documents/')) {
        return;
      }
      
      logger.info('Document uploaded', { 
        path: filePath, 
        size: object.size,
        type: contentType 
      });
      
      // Extract company and document info from path
      // Path format: companies/{companyId}/documents/{userId}/{fileName}
      const pathParts = filePath.split('/');
      const companyId = pathParts[1];
      const userId = pathParts[3];
      const fileName = pathParts[4];
      
      // Create document record
      const documentRef = admin.firestore()
        .collection('documents')
        .doc();
      
      await documentRef.set({
        id: documentRef.id,
        companyId,
        name: fileName,
        originalName: fileName,
        path: filePath,
        url: `https://storage.googleapis.com/${object.bucket}/${filePath}`,
        mimeType: contentType || 'application/octet-stream',
        size: parseInt(object.size || '0'),
        category: 'benefits', // Default category
        uploadedBy: userId,
        processing: {
          status: 'processing',
          startedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        sharing: {
          isPublic: false,
          allowedRoles: ['employee', 'hr-admin', 'company-admin']
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Process document asynchronously
      try {
        const processingResult = await processDocument({
          documentId: documentRef.id,
          filePath,
          contentType: contentType || '',
          companyId
        });
        
        // Update document with processing results
        await documentRef.update({
          'processing.status': 'completed',
          'processing.completedAt': admin.firestore.FieldValue.serverTimestamp(),
          'processing.extractedText': processingResult.text,
          'processing.metadata': processingResult.metadata,
          'processing.embeddings': processingResult.embeddings,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        logger.info('Document processing completed', { 
          documentId: documentRef.id,
          textLength: processingResult.text?.length 
        });
      } catch (processingError) {
        logger.error('Document processing failed', { 
          error: processingError,
          documentId: documentRef.id 
        });
        
        await documentRef.update({
          'processing.status': 'failed',
          'processing.error': String(processingError),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      logger.error('Document upload handler failed', { error, path: object.name });
    }
  });

// functions/src/services/document.ts
import { Storage } from '@google-cloud/storage';
import { DocumentProcessorServiceClient } from '@google-cloud/documentai';

const storage = new Storage();
const documentAI = new DocumentProcessorServiceClient();

export async function processDocument(params: {
  documentId: string;
  filePath: string;
  contentType: string;
  companyId: string;
}) {
  const { filePath, contentType } = params;
  
  // Download file from storage
  const bucket = storage.bucket(process.env.FIREBASE_STORAGE_BUCKET!);
  const file = bucket.file(filePath);
  const [buffer] = await file.download();
  
  let extractedText = '';
  let metadata: any = {};
  
  // Process based on file type
  if (contentType.includes('pdf')) {
    // Use Document AI for PDFs
    const request = {
      name: `projects/${process.env.GCP_PROJECT}/locations/us/processors/${process.env.DOCUMENT_AI_PROCESSOR_ID}`,
      rawDocument: {
        content: buffer.toString('base64'),
        mimeType: contentType,
      },
    };
    
    const [result] = await documentAI.processDocument(request);
    extractedText = result.document?.text || '';
    metadata = {
      pages: result.document?.pages?.length || 0,
      entities: result.document?.entities || []
    };
  } else if (contentType.includes('text')) {
    // Direct text extraction
    extractedText = buffer.toString('utf-8');
  } else if (contentType.includes('image')) {
    // OCR for images
    // Implement OCR logic here
  }
  
  // Generate embeddings (stub - implement with Vertex AI)
  const embeddings = await generateEmbeddings(extractedText);
  
  return {
    text: extractedText,
    metadata,
    embeddings
  };
}

async function generateEmbeddings(text: string): Promise<number[]> {
  // TODO: Implement with Vertex AI embeddings
  return [];
}
```

#### 4.4 Scheduled Functions
**Time**: 45 minutes

```typescript
// functions/src/triggers/scheduled.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';

/**
 * Daily cleanup of old sessions and temporary data
 */
export const dailyCleanup = functions
  .region('us-central1')
  .pubsub.schedule('0 2 * * *') // 2 AM daily
  .timeZone('America/New_York')
  .onRun(async (context) => {
    logger.info('Starting daily cleanup');
    
    const batch = admin.firestore().batch();
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    // Clean old rate limit records
    const rateLimits = await admin.firestore()
      .collection('rate_limits')
      .where('windowStart', '<', thirtyDaysAgo)
      .limit(500)
      .get();
    
    rateLimits.forEach(doc => batch.delete(doc.ref));
    
    // Clean old sessions
    const sessions = await admin.firestore()
      .collection('sessions')
      .where('lastAccessedAt', '<', thirtyDaysAgo)
      .limit(500)
      .get();
    
    sessions.forEach(doc => batch.delete(doc.ref));
    
    // Archive old conversations
    const conversations = await admin.firestore()
      .collectionGroup('conversations')
      .where('status', '==', 'active')
      .where('updatedAt', '<', thirtyDaysAgo)
      .limit(100)
      .get();
    
    conversations.forEach(doc => {
      batch.update(doc.ref, {
        status: 'archived',
        archivedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();
    
    logger.info('Daily cleanup completed', {
      rateLimitsDeleted: rateLimits.size,
      sessionsDeleted: sessions.size,
      conversationsArchived: conversations.size
    });
  });

/**
 * Process email queue every 5 minutes
 */
export const processEmailQueue = functions
  .region('us-central1')
  .pubsub.schedule('*/5 * * * *') // Every 5 minutes
  .onRun(async (context) => {
    const pendingEmails = await admin.firestore()
      .collection('email_queue')
      .where('status', '==', 'pending')
      .limit(50)
      .get();
    
    if (pendingEmails.empty) {
      return;
    }
    
    logger.info('Processing email queue', { count: pendingEmails.size });
    
    const batch = admin.firestore().batch();
    
    for (const doc of pendingEmails.docs) {
      const email = doc.data();
      
      try {
        // Send email (integrate with your email service)
        // await sendEmail(email);
        
        batch.update(doc.ref, {
          status: 'sent',
          sentAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (error) {
        logger.error('Failed to send email', { error, emailId: doc.id });
        
        batch.update(doc.ref, {
          status: 'failed',
          error: String(error),
          retryCount: admin.firestore.FieldValue.increment(1)
        });
      }
    }
    
    await batch.commit();
  });

/**
 * Weekly analytics aggregation
 */
export const weeklyAnalytics = functions
  .region('us-central1')
  .pubsub.schedule('0 1 * * 0') // Sunday 1 AM
  .timeZone('America/New_York')
  .onRun(async (context) => {
    logger.info('Starting weekly analytics aggregation');
    
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    // Aggregate user activity
    const events = await admin.firestore()
      .collection('analytics')
      .where('timestamp', '>=', oneWeekAgo)
      .get();
    
    const aggregated = events.docs.reduce((acc, doc) => {
      const event = doc.data();
      const companyId = event.companyId || 'unknown';
      
      if (!acc[companyId]) {
        acc[companyId] = {
          totalEvents: 0,
          uniqueUsers: new Set(),
          eventTypes: {}
        };
      }
      
      acc[companyId].totalEvents++;
      acc[companyId].uniqueUsers.add(event.userId);
      acc[companyId].eventTypes[event.eventType] = 
        (acc[companyId].eventTypes[event.eventType] || 0) + 1;
      
      return acc;
    }, {} as Record<string, any>);
    
    // Save aggregated data
    const batch = admin.firestore().batch();
    
    Object.entries(aggregated).forEach(([companyId, data]) => {
      const reportRef = admin.firestore()
        .collection('analytics_reports')
        .doc();
      
      batch.set(reportRef, {
        companyId,
        period: 'weekly',
        startDate: oneWeekAgo,
        endDate: Date.now(),
        metrics: {
          totalEvents: data.totalEvents,
          uniqueUsers: data.uniqueUsers.size,
          eventTypes: data.eventTypes
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    await batch.commit();
    
    logger.info('Weekly analytics completed', {
      companiesProcessed: Object.keys(aggregated).length
    });
  });
```

#### 4.5 Storage Service Implementation
**Time**: 30 minutes

```typescript
// lib/firebase/storage-service.ts
import { 
  ref, 
  uploadBytes, 
  uploadBytesResumable,
  getDownloadURL, 
  deleteObject,
  listAll,
  getMetadata,
  updateMetadata
} from 'firebase/storage';
import { storage } from './firebase';
import { v4 as uuidv4 } from 'uuid';

export class StorageService {
  /**
   * Upload a document with progress tracking
   */
  async uploadDocument(
    companyId: string,
    userId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<{
    path: string;
    downloadURL: string;
    metadata: any;
  }> {
    const fileId = uuidv4();
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${fileId}_${safeName}`;
    const path = `companies/${companyId}/documents/${userId}/${fileName}`;
    
    const storageRef = ref(storage, path);
    
    // Set metadata
    const metadata = {
      customMetadata: {
        uploadedBy: userId,
        companyId: companyId,
        originalName: file.name,
        fileId: fileId,
        uploadedAt: new Date().toISOString()
      },
      contentType: file.type,
      cacheControl: 'private, max-age=3600'
    };
    
    // Upload with progress tracking
    if (onProgress) {
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);
      
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          },
          (error) => {
            console.error('Upload error:', error);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            const metadata = await getMetadata(uploadTask.snapshot.ref);
            resolve({ path, downloadURL, metadata });
          }
        );
      });
    } else {
      // Simple upload without progress
      const snapshot = await uploadBytes(storageRef, file, metadata);
      const downloadURL = await getDownloadURL(snapshot.ref);
      const metadata = await getMetadata(snapshot.ref);
      return { path, downloadURL, metadata };
    }
  }

  /**
   * Get all documents for a company
   */
  async getCompanyDocuments(companyId: string): Promise<Array<{
    name: string;
    path: string;
    url: string;
    metadata: any;
  }>> {
    const listRef = ref(storage, `companies/${companyId}/documents`);
    const result = await listAll(listRef);
    
    const documents = await Promise.all(
      result.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        const metadata = await getMetadata(itemRef);
        return {
          name: itemRef.name,
          path: itemRef.fullPath,
          url,
          metadata
        };
      })
    );
    
    return documents;
  }

  /**
   * Delete a document
   */
  async deleteDocument(path: string): Promise<void> {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  }

  /**
   * Update document metadata
   */
  async updateDocumentMetadata(
    path: string, 
    metadata: Record<string, string>
  ): Promise<void> {
    const storageRef = ref(storage, path);
    await updateMetadata(storageRef, {
      customMetadata: metadata
    });
  }

  /**
   * Generate a signed URL for temporary access
   */
  async getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
    // Note: This requires Admin SDK in Cloud Functions
    // For client-side, use getDownloadURL instead
    const storageRef = ref(storage, path);
    return getDownloadURL(storageRef);
  }
}

export const storageService = new StorageService();
```

---

## 🤖 Phase 5: Vertex AI Integration
**Timeline**: 6 hours  
**Risk Level**: Medium

### 🎯 Objectives
- Integrate Vertex AI for chat responses
- Implement RAG (Retrieval Augmented Generation)
- Set up embeddings generation
- Create function calling for tools
- Implement streaming responses

### 📦 Deliverables

#### 5.1 Vertex AI Client Setup
**Time**: 45 minutes

```typescript
// lib/ai/vertex-ai-client.ts
import { VertexAI, HarmCategory, HarmBlockThreshold, FunctionDeclaration } from '@google-cloud/vertexai';
import { Content, Part } from '@google-cloud/vertexai';

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: process.env.NEXT_PUBLIC_GCP_PROJECT_ID!,
  location: process.env.NEXT_PUBLIC_VERTEX_AI_LOCATION || 'us-central1'
});

// Configure model
const generativeModel = vertexAI.getGenerativeModel({
  model: 'gemini-2.0-flash-exp',
  generationConfig: {
    maxOutputTokens: 8192,
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
  },
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    }
  ],
});

// Export configured model
export { generativeModel, vertexAI };

// System prompt for benefits assistant
export const SYSTEM_PROMPT = `You are a helpful benefits assistant for employees. 
You have access to company benefits information, enrollment details, and can help with:
- Understanding different benefit plans
- Comparing coverage options
- Enrollment guidance
- Cost calculations
- Benefits eligibility
- Claims assistance

Always be accurate, helpful, and professional. If you're unsure about specific details, 
ask for clarification rather than making assumptions.`;
```

#### 5.2 RAG Implementation
**Time**: 1.5 hours

```typescript
// lib/ai/rag-service.ts
import { VertexAI } from '@google-cloud/vertexai';
import { documentService } from '@/lib/firebase/firestore-service';
import { Timestamp } from 'firebase/firestore';

interface RAGContext {
  documents: Array<{
    id: string;
    content: string;
    metadata: any;
    relevanceScore: number;
  }>;
  benefitPlans?: any[];
  userContext?: any;
}

export class RAGService {
  private vertexAI: VertexAI;
  private embeddingModel: any;

  constructor() {
    this.vertexAI = new VertexAI({
      project: process.env.NEXT_PUBLIC_GCP_PROJECT_ID!,
      location: 'us-central1'
    });
    
    this.embeddingModel = this.vertexAI.getGenerativeModel({
      model: 'text-embedding-004',
    });
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbeddings(text: string): Promise<number[]> {
    const result = await this.embeddingModel.embedContent({
      content: { parts: [{ text }] }
    });
    return result.embedding.values;
  }

  /**
   * Search for relevant documents
   */
  async searchDocuments(
    query: string,
    companyId: string,
    limit = 5
  ): Promise<RAGContext['documents']> {
    // Generate query embeddings
    const queryEmbeddings = await this.generateEmbeddings(query);
    
    // Get company documents with embeddings
    const documents = await documentService.getCompanyDocuments(companyId);
    
    // Calculate similarity scores
    const scoredDocs = documents
      .filter(doc => doc.processing?.embeddings && doc.processing?.extractedText)
      .map(doc => {
        const similarity = this.cosineSimilarity(
          queryEmbeddings,
          doc.processing.embeddings
        );
        return {
          id: doc.id,
          content: doc.processing.extractedText || '',
          metadata: {
            name: doc.name,
            category: doc.category,
            uploadedAt: doc.createdAt
          },
          relevanceScore: similarity
        };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
    
    return scoredDocs;
  }

  /**
   * Build context for AI response
   */
  async buildContext(
    query: string,
    companyId: string,
    userId: string
  ): Promise<RAGContext> {
    // Search relevant documents
    const documents = await this.searchDocuments(query, companyId);
    
    // Get user's benefit plans
    const benefitPlans = await this.getUserBenefitPlans(companyId, userId);
    
    // Get user context
    const userContext = await this.getUserContext(userId);
    
    return {
      documents,
      benefitPlans,
      userContext
    };
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  private async getUserBenefitPlans(companyId: string, userId: string) {
    // Implement based on your business logic
    return [];
  }

  private async getUserContext(userId: string) {
    // Get user profile and preferences
    return {};
  }
}

export const ragService = new RAGService();
```

#### 5.3 Chat API with Streaming
**Time**: 1.5 hours

```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromHeader } from '@/lib/auth/session';
import { generativeModel, SYSTEM_PROMPT } from '@/lib/ai/vertex-ai-client';
import { ragService } from '@/lib/ai/rag-service';
import { conversationService, messageService } from '@/lib/firebase/firestore-service';
import { StreamingTextResponse } from 'ai';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const user = await getSessionFromHeader(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, conversationId } = await req.json();

    if (!message || !conversationId) {
      return NextResponse.json(
        { error: 'Message and conversationId required' },
        { status: 400 }
      );
    }

    // Get RAG context
    const context = await ragService.buildContext(
      message,
      user.companyId!,
      user.uid
    );

    // Build prompt with context
    const enhancedPrompt = buildPromptWithContext(message, context);

    // Get conversation history
    const messages = await messageService.getMessages(
      user.companyId!,
      conversationId,
      10 // Last 10 messages for context
    );

    // Convert to Vertex AI format
    const history = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Add system prompt as first message
    if (history.length === 0) {
      history.push({
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT }]
      });
      history.push({
        role: 'model',
        parts: [{ text: 'I understand. I\'m ready to help with benefits questions.' }]
      });
    }

    // Add current message
    history.push({
      role: 'user',
      parts: [{ text: enhancedPrompt }]
    });

    // Save user message
    await messageService.addMessage(
      user.companyId!,
      conversationId,
      {
        role: 'user',
        content: message,
        conversationId
      }
    );

    // Generate streaming response
    const chat = generativeModel.startChat({ history });
    const result = await chat.sendMessageStream(enhancedPrompt);

    // Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = '';
        let tokenCount = 0;

        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            fullResponse += text;
            tokenCount += text.length / 4; // Approximate token count
            controller.enqueue(new TextEncoder().encode(text));
          }

          // Save assistant message
          await messageService.addMessage(
            user.companyId!,
            conversationId,
            {
              role: 'assistant',
              content: fullResponse,
              conversationId,
              metadata: {
                model: 'gemini-2.0-flash-exp',
                tokensUsed: Math.round(tokenCount),
                sources: context.documents.map(d => d.metadata.name)
              }
            }
          );

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

function buildPromptWithContext(message: string, context: any): string {
  let prompt = message;

  // Add document context if available
  if (context.documents && context.documents.length > 0) {
    prompt += '\n\nRelevant information from company documents:\n';
    context.documents.forEach((doc: any, index: number) => {
      prompt += `\n[Source ${index + 1}: ${doc.metadata.name}]\n`;
      prompt += doc.content.substring(0, 1000) + '...\n';
    });
  }

  // Add benefit plans context
  if (context.benefitPlans && context.benefitPlans.length > 0) {
    prompt += '\n\nAvailable benefit plans:\n';
    context.benefitPlans.forEach((plan: any) => {
      prompt += `- ${plan.name} (${plan.type}): ${plan.description}\n`;
    });
  }

  prompt += '\n\nPlease provide a helpful response based on the above information.';
  return prompt;
}
```

#### 5.4 Function Calling for Tools
**Time**: 1 hour

```typescript
// lib/ai/tools.ts
import { FunctionDeclaration } from '@google-cloud/vertexai';

// Define available tools
export const benefitsTools: FunctionDeclaration[] = [
  {
    name: 'compareBenefitPlans',
    description: 'Compare two or more benefit plans',
    parameters: {
      type: 'object',
      properties: {
        planIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs of plans to compare'
        },
        criteria: {
          type: 'array',
          items: { type: 'string' },
          description: 'Comparison criteria (e.g., cost, coverage, deductible)'
        }
      },
      required: ['planIds']
    }
  },
  {
    name: 'calculateBenefitsCost',
    description: 'Calculate total benefits cost for an employee',
    parameters: {
      type: 'object',
      properties: {
        selections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              planId: { type: 'string' },
              coverage: { type: 'string' }
            }
          }
        },
        includeEmployerContribution: {
          type: 'boolean',
          description: 'Include employer contribution in calculation'
        }
      },
      required: ['selections']
    }
  },
  {
    name: 'checkEligibility',
    description: 'Check eligibility for a specific benefit',
    parameters: {
      type: 'object',
      properties: {
        benefitType: {
          type: 'string',
          enum: ['health', 'dental', 'vision', '401k', 'life', 'disability']
        },
        employeeInfo: {
          type: 'object',
          properties: {
            hireDate: { type: 'string' },
            employmentType: { type: 'string' },
            hoursPerWeek: { type: 'number' }
          }
        }
      },
      required: ['benefitType']
    }
  },
  {
    name: 'searchDocuments',
    description: 'Search benefits documents for specific information',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query'
        },
        documentType: {
          type: 'string',
          enum: ['summary', 'full', 'form', 'faq'],
          description: 'Type of document to search'
        }
      },
      required: ['query']
    }
  }
];

// Tool implementation handlers
export const toolHandlers = {
  async compareBenefitPlans(params: any) {
    // Implement plan comparison logic
    return {
      comparison: 'Plan comparison results...'
    };
  },

  async calculateBenefitsCost(params: any) {
    // Implement cost calculation
    return {
      totalMonthlyCost: 500,
      breakdown: []
    };
  },

  async checkEligibility(params: any) {
    // Implement eligibility check
    return {
      eligible: true,
      requirements: []
    };
  },

  async searchDocuments(params: any) {
    // Implement document search
    return {
      results: []
    };
  }
};

// Enhanced chat with function calling
export async function chatWithTools(
  message: string,
  context: any,
  model: any
) {
  const chat = model.startChat({
    tools: [{ functionDeclarations: benefitsTools }]
  });

  const result = await chat.sendMessage(message);
  
  // Check if model wants to use a tool
  const functionCall = result.response.functionCalls?.[0];
  if (functionCall) {
    const handler = toolHandlers[functionCall.name as keyof typeof toolHandlers];
    if (handler) {
      const toolResult = await handler(functionCall.args);
      
      // Send tool result back to model
      const followUp = await chat.sendMessage([{
        functionResponse: {
          name: functionCall.name,
          response: toolResult
        }
      }]);
      
      return followUp.response.text();
    }
  }

  return result.response.text();
}
```

#### 5.5 Embeddings and Vector Search
**Time**: 1 hour

```typescript
// lib/ai/embeddings-service.ts
import { VertexAI } from '@google-cloud/vertexai';
import { Pinecone } from '@pinecone-database/pinecone';
import { documentService } from '@/lib/firebase/firestore-service';

export class EmbeddingsService {
  private vertexAI: VertexAI;
  private pinecone: Pinecone;
  private embeddingModel: any;

  constructor() {
    this.vertexAI = new VertexAI({
      project: process.env.NEXT_PUBLIC_GCP_PROJECT_ID!,
      location: 'us-central1'
    });
    
    this.embeddingModel = this.vertexAI.getGenerativeModel({
      model: 'text-embedding-004',
    });

    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
      environment: process.env.PINECONE_ENVIRONMENT!
    });
  }

  /**
   * Generate and store embeddings for a document
   */
  async processDocument(documentId: string, text: string, metadata: any) {
    // Split text into chunks
    const chunks = this.splitIntoChunks(text, 1000);
    
    // Generate embeddings for each chunk
    const embeddings = await Promise.all(
      chunks.map(chunk => this.generateEmbedding(chunk))
    );

    // Store in Pinecone
    const index = this.pinecone.index('benefits-docs');
    const vectors = embeddings.map((embedding, i) => ({
      id: `${documentId}_chunk_${i}`,
      values: embedding,
      metadata: {
        ...metadata,
        chunk: i,
        text: chunks[i]
      }
    }));

    await index.upsert(vectors);

    // Update document with embedding status
    await documentService.update(documentId, {
      'processing.embeddingsGenerated': true,
      'processing.chunkCount': chunks.length
    });
  }

  /**
   * Search for similar documents
   */
  async searchSimilar(
    query: string,
    companyId: string,
    limit = 5
  ): Promise<Array<{
    text: string;
    score: number;
    metadata: any;
  }>> {
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Search in Pinecone
    const index = this.pinecone.index('benefits-docs');
    const results = await index.query({
      vector: queryEmbedding,
      topK: limit,
      filter: { companyId },
      includeMetadata: true
    });

    return results.matches.map(match => ({
      text: match.metadata?.text as string,
      score: match.score || 0,
      metadata: match.metadata
    }));
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const result = await this.embeddingModel.embedContent({
      content: { parts: [{ text }] }
    });
    return result.embedding.values;
  }

  private splitIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    const sentences = text.split('. ');
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > chunkSize) {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      }
    }

    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  }
}

export const embeddingsService = new EmbeddingsService();
```

---

## 📊 Implementation Timeline

### Phase 4: Cloud Functions (4 hours)
- ✅ Hour 1: Setup and user lifecycle functions
- ✅ Hour 2: Document processing pipeline
- ✅ Hour 3: Scheduled functions
- ✅ Hour 4: Storage service and testing

### Phase 5: Vertex AI (6 hours)
- ✅ Hour 1: Client setup and configuration
- ✅ Hour 2-3: RAG implementation
- ✅ Hour 4-5: Chat API with streaming
- ✅ Hour 6: Function calling and tools
- ✅ Hour 7: Embeddings and vector search
- ✅ Hour 8: Integration testing

---

## ✅ Success Criteria

### Phase 4 Validation
```bash
# Deploy functions locally
cd functions
npm run serve

# Test triggers
firebase emulators:exec --only functions,firestore,storage "npm test"

# Verify:
- [ ] User creation trigger works
- [ ] Document upload triggers processing
- [ ] Scheduled functions execute
- [ ] Email queue processes
```

### Phase 5 Validation
```typescript
// Test chat with RAG
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'What health plans are available?',
    conversationId: 'test-123'
  })
});

// Verify:
- [ ] Streaming response works
- [ ] Context includes relevant documents
- [ ] Function calling executes
- [ ] Embeddings generated
```

---

## 🚨 Common Issues & Solutions

### Issue 1: Vertex AI Authentication
```bash
# Solution: Set up Application Default Credentials
gcloud auth application-default login
export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
```

### Issue 2: Function Deployment Errors
```bash
# Solution: Check Node version
cd functions
nvm use 20
npm install
npm run build
firebase deploy --only functions
```

### Issue 3: Streaming Response Issues
```typescript
// Solution: Use proper streaming response
return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  }
});
```

---

## 📝 Testing Checklist

### Cloud Functions
- [ ] User lifecycle events trigger correctly
- [ ] Documents process successfully
- [ ] Scheduled jobs run on time
- [ ] Error handling works
- [ ] Logs are structured

### Vertex AI
- [ ] Chat responses are contextual
- [ ] RAG retrieves relevant documents
- [ ] Streaming works smoothly
- [ ] Function calling executes
- [ ] Embeddings are accurate

---

**Plan Generated**: January 2025  
**Implementation Ready**: YES  
**Estimated Time**: 10 hours total