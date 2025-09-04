/**
 * Firestore service layer for database operations
 * Provides a clean API for all Firestore interactions
 */

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
  Timestamp,
  type DocumentData,
  type QueryConstraint,
  writeBatch,
  serverTimestamp,
  increment,
  type Unsubscribe,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import { db as firestore } from '@/lib/firebase/client';
import type { 
  Company, 
  User, 
  BenefitPlan, 
  Conversation, 
  Message, 
  Document as DocType,
  Enrollment,
  AnalyticsEvent,
  Notification,
  AuditLog
} from './models';

/**
 * Base service class with common CRUD operations
 */
class BaseService<T extends DocumentData> {
  constructor(protected collectionName: string) {}

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T> {
    const docRef = doc(collection(firestore, this.collectionName));
    const document = {
      ...data,
      id: docRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    } as unknown as T;
    
    await setDoc(docRef, document);
    return { ...document, id: docRef.id } as T;
  }

  async get(id: string): Promise<T | null> {
    const docRef = doc(firestore, this.collectionName, id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as unknown as T;
    }
    return null;
  }

  async update(id: string, data: Partial<T>): Promise<void> {
    const docRef = doc(firestore, this.collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }

  async delete(id: string): Promise<void> {
    const docRef = doc(firestore, this.collectionName, id);
    await deleteDoc(docRef);
  }

  async list(constraints: QueryConstraint[] = []): Promise<T[]> {
    const q = query(collection(firestore, this.collectionName), ...constraints);
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as unknown as T));
  }

  subscribe(
    constraints: QueryConstraint[],
    callback: (items: T[]) => void
  ): Unsubscribe {
    const q = query(collection(firestore, this.collectionName), ...constraints);
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({ id: doc.id, ...doc.data() } as unknown as T));
      callback(items);
    });
  }
}

/**
 * Company service
 */
export class CompanyService extends BaseService<Company> {
  constructor() {
    super('companies');
  }

  async getByDomain(domain: string): Promise<Company | null> {
    const q = query(
      collection(firestore, this.collectionName),
      where('domain', '==', domain),
      limit(1)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Company;
    }
    return null;
  }

  async getActiveCompanies(): Promise<Company[]> {
    return this.list([
      where('status', '==', 'active'),
      orderBy('name', 'asc')
    ]);
  }

  async updateSubscription(companyId: string, subscription: Partial<Company['subscription']>): Promise<void> {
    await this.update(companyId, {
      subscription: subscription as Company['subscription']
    });
  }
}

/**
 * User service
 */
export class UserService extends BaseService<User> {
  constructor() {
    super('users');
  }

  async getByEmail(email: string): Promise<User | null> {
    const q = query(
      collection(firestore, this.collectionName),
      where('email', '==', email),
      limit(1)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as unknown as User;
    }
    return null;
  }

  async getUsersByCompany(companyId: string, role?: string): Promise<User[]> {
    const constraints: QueryConstraint[] = [
      where('companyId', '==', companyId),
      where('status', '==', 'active')
    ];
    
    if (role) {
      constraints.push(where('role', '==', role));
    }
    
    constraints.push(orderBy('createdAt', 'desc'));
    
    return this.list(constraints);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.update(userId, {
      'metadata.lastLoginAt': serverTimestamp(),
      'metadata.loginCount': increment(1)
    } as Partial<User>);
  }

  async updateProfile(userId: string, profile: Partial<User['profile']>): Promise<void> {
    await this.update(userId, {
      profile: profile as User['profile']
    });
  }
}

/**
 * Benefit Plan service
 */
export class BenefitPlanService {
  private collectionPath(companyId: string) {
    return `companies/${companyId}/benefitPlans`;
  }

  async create(companyId: string, data: Omit<BenefitPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<BenefitPlan> {
    const colRef = collection(firestore, this.collectionPath(companyId));
    const docRef = doc(colRef);
    const plan = {
      ...data,
      id: docRef.id,
      companyId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    } as BenefitPlan;
    
    await setDoc(docRef, plan);
    return { ...plan, id: docRef.id } as BenefitPlan;
  }

  async get(companyId: string, planId: string): Promise<BenefitPlan | null> {
    const docRef = doc(firestore, this.collectionPath(companyId), planId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as BenefitPlan;
    }
    return null;
  }

  async getActivePlans(companyId: string): Promise<BenefitPlan[]> {
    const q = query(
      collection(firestore, this.collectionPath(companyId)),
      where('status', '==', 'active'),
      orderBy('type', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BenefitPlan));
  }

  async getPlansByType(companyId: string, type: BenefitPlan['type']): Promise<BenefitPlan[]> {
    const q = query(
      collection(firestore, this.collectionPath(companyId)),
      where('type', '==', type),
      where('status', '==', 'active'),
      orderBy('name', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BenefitPlan));
  }
}

/**
 * Conversation service
 */
export class ConversationService {
  private collectionPath(companyId: string) {
    return `companies/${companyId}/conversations`;
  }

  async create(
    userId: string, 
    companyId: string, 
    title: string,
    metadata?: Partial<Conversation['metadata']>
  ): Promise<Conversation> {
    const colRef = collection(firestore, this.collectionPath(companyId));
    const docRef = doc(colRef);
    const conversation = {
      id: docRef.id,
      userId,
      companyId,
      title,
      status: 'active',
      visibility: 'private',
      metadata: {
        model: 'gemini-2.0-flash-exp',
        totalTokensUsed: 0,
        messageCount: 0,
        lastMessageAt: serverTimestamp(),
        ...metadata
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    } as Conversation;
    
    await setDoc(docRef, conversation);
    return { ...conversation, id: docRef.id } as Conversation;
  }

  async getUserConversations(companyId: string, userId: string, limitCount = 20): Promise<Conversation[]> {
    const q = query(
      collection(firestore, this.collectionPath(companyId)),
      where('userId', '==', userId),
      where('status', '!=', 'deleted'),
      orderBy('status'),
      orderBy('updatedAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
  }

  async updateMetadata(
    companyId: string, 
    conversationId: string, 
    metadata: Partial<Conversation['metadata']>
  ): Promise<void> {
    const docRef = doc(firestore, this.collectionPath(companyId), conversationId);
    await updateDoc(docRef, {
      metadata,
      updatedAt: serverTimestamp()
    });
  }

  async archive(companyId: string, conversationId: string): Promise<void> {
    const docRef = doc(firestore, this.collectionPath(companyId), conversationId);
    await updateDoc(docRef, {
      status: 'archived',
      updatedAt: serverTimestamp()
    });
  }
}

/**
 * Message service
 */
export class MessageService {
  private collectionPath(companyId: string, conversationId: string) {
    return `companies/${companyId}/conversations/${conversationId}/messages`;
  }

  async addMessage(
    companyId: string,
    conversationId: string,
    message: Omit<Message, 'id' | 'createdAt'>
  ): Promise<Message> {
    const colRef = collection(firestore, this.collectionPath(companyId, conversationId));
    const docRef = doc(colRef);
    const msg = {
      ...message,
      id: docRef.id,
      createdAt: serverTimestamp()
    } as Message;
    
    await setDoc(docRef, msg);
    
    // Update conversation metadata
    const convRef = doc(firestore, `companies/${companyId}/conversations`, conversationId);
    await updateDoc(convRef, {
      'metadata.lastMessageAt': serverTimestamp(),
      'metadata.messageCount': increment(1),
      'metadata.totalTokensUsed': increment(message.metadata?.tokensUsed || 0),
      updatedAt: serverTimestamp()
    });
    
    return { ...msg, id: docRef.id } as Message;
  }

  async getMessages(
    companyId: string,
    conversationId: string,
    limitCount = 50
  ): Promise<Message[]> {
    const q = query(
      collection(firestore, this.collectionPath(companyId, conversationId)),
      orderBy('createdAt', 'asc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
  }

  subscribeToMessages(
    companyId: string,
    conversationId: string,
    callback: (messages: Message[]) => void
  ): Unsubscribe {
    const q = query(
      collection(firestore, this.collectionPath(companyId, conversationId)),
      orderBy('createdAt', 'asc')
    );
    
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      callback(messages);
    });
  }
}

/**
 * Document service
 */
export class DocumentService extends BaseService<DocType> {
  constructor() {
    super('documents');
  }

  async getCompanyDocuments(companyId: string, category?: string): Promise<DocType[]> {
    const constraints: QueryConstraint[] = [
      where('companyId', '==', companyId),
      where('processing.status', '==', 'completed')
    ];
    
    if (category) {
      constraints.push(where('category', '==', category));
    }
    
    constraints.push(orderBy('createdAt', 'desc'));
    
    return this.list(constraints);
  }

  async updateProcessingStatus(
    documentId: string, 
    status: DocType['processing']['status'],
    error?: string
  ): Promise<void> {
    const updates: any = {
      'processing.status': status,
      updatedAt: serverTimestamp()
    };
    
    if (status === 'completed') {
      updates['processing.completedAt'] = serverTimestamp();
    } else if (status === 'failed' && error) {
      updates['processing.error'] = error;
    }
    
    await this.update(documentId, updates);
  }
}

/**
 * Enrollment service
 */
export class EnrollmentService extends BaseService<Enrollment> {
  constructor() {
    super('enrollments');
  }

  async getUserEnrollment(userId: string, year: number): Promise<Enrollment | null> {
    const q = query(
      collection(firestore, this.collectionName),
      where('userId', '==', userId),
      where('enrollmentPeriod.year', '==', year),
      limit(1)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Enrollment;
    }
    return null;
  }

  async getCompanyEnrollments(companyId: string, year: number): Promise<Enrollment[]> {
    return this.list([
      where('companyId', '==', companyId),
      where('enrollmentPeriod.year', '==', year),
      orderBy('createdAt', 'desc')
    ]);
  }

  async updateSelections(enrollmentId: string, selections: Enrollment['selections']): Promise<void> {
    await this.update(enrollmentId, {
      selections,
      status: 'in-progress'
    });
  }

  async completeEnrollment(enrollmentId: string, signature: Enrollment['signature']): Promise<void> {
    await this.update(enrollmentId, {
      status: 'completed',
      signature
    });
  }
}

/**
 * Analytics service
 */
export class AnalyticsService extends BaseService<AnalyticsEvent> {
  constructor() {
    super('analytics');
  }

  async trackEvent(event: Omit<AnalyticsEvent, 'id' | 'timestamp'>): Promise<void> {
    const docRef = doc(collection(firestore, this.collectionName));
    await setDoc(docRef, {
      ...event,
      id: docRef.id,
      timestamp: serverTimestamp()
    });
  }

  async getCompanyAnalytics(companyId: string, days = 30): Promise<AnalyticsEvent[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.list([
      where('companyId', '==', companyId),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      orderBy('timestamp', 'desc')
    ]);
  }
}

/**
 * Notification service
 */
export class NotificationService extends BaseService<Notification> {
  constructor() {
    super('notifications');
  }

  async getUserNotifications(userId: string, unreadOnly = false): Promise<Notification[]> {
    const constraints: QueryConstraint[] = [
      where('userId', '==', userId)
    ];
    
    if (unreadOnly) {
      constraints.push(where('read', '==', false));
    }
    
    constraints.push(orderBy('createdAt', 'desc'), limit(50));
    
    return this.list(constraints);
  }

  async markAsRead(notificationId: string): Promise<void> {
    await this.update(notificationId, {
      read: true,
      readAt: serverTimestamp() as any
    });
  }

  async markAllAsRead(userId: string): Promise<void> {
    const q = query(
      collection(firestore, this.collectionName),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(firestore);
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        read: true,
        readAt: serverTimestamp()
      });
    });
    
    await batch.commit();
  }
}

/**
 * Audit Log service
 */
export class AuditLogService extends BaseService<AuditLog> {
  constructor() {
    super('audit_logs');
  }

  async log(action: string, data: Omit<AuditLog, 'id' | 'timestamp' | 'action'>): Promise<void> {
    const docRef = doc(collection(firestore, this.collectionName));
    await setDoc(docRef, {
      ...data,
      id: docRef.id,
      action,
      timestamp: serverTimestamp()
    });
  }

  async getUserAuditLogs(userId: string, days = 30): Promise<AuditLog[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.list([
      where('userId', '==', userId),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      orderBy('timestamp', 'desc'),
      limit(100)
    ]);
  }

  async getCompanyAuditLogs(companyId: string, days = 30): Promise<AuditLog[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return this.list([
      where('companyId', '==', companyId),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      orderBy('timestamp', 'desc'),
      limit(500)
    ]);
  }
}

/**
 * Export service instances
 */
export const companyService = new CompanyService();
export const userService = new UserService();
export const benefitPlanService = new BenefitPlanService();
export const conversationService = new ConversationService();
export const messageService = new MessageService();
export const documentService = new DocumentService();
export const enrollmentService = new EnrollmentService();
export const analyticsService = new AnalyticsService();
export const notificationService = new NotificationService();
export const auditLogService = new AuditLogService();
