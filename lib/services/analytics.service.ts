import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';

export interface AnalyticsData {
  totalUsers: number;
  totalCompanies: number;
  totalConversations: number;
  totalDocuments: number;
  activeUsers: number;
  chatMessages: number;
  apiCalls: number;
  storageUsed: number;
}

export interface CompanyAnalytics {
  companyId: string;
  employeeCount: number;
  activeEmployees: number;
  documentsCount: number;
  conversationsCount: number;
  monthlyChats: number;
  enrollmentRate: number;
  averageCostPerEmployee: number;
}

export interface UserActivity {
  userId: string;
  userName: string;
  lastActive: Date;
  conversationCount: number;
  messageCount: number;
  documentsViewed: number;
}

export interface ChatAnalytics {
  totalChats: number;
  averageMessagesPerChat: number;
  topQuestions: string[];
  peakHours: { hour: number; count: number }[];
  averageResponseTime: number;
  satisfactionRate: number;
}

class AnalyticsService {
  async getPlatformAnalytics(): Promise<AnalyticsData> {
    try {
      // Get total users
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const totalUsers = usersSnapshot.size;

      // Get total companies
      const companiesQuery = query(collection(db, 'companies'));
      const companiesSnapshot = await getDocs(companiesQuery);
      const totalCompanies = companiesSnapshot.size;

      // Get total conversations
      const conversationsQuery = query(collection(db, 'conversations'));
      const conversationsSnapshot = await getDocs(conversationsQuery);
      const totalConversations = conversationsSnapshot.size;

      // Get total documents
      const documentsQuery = query(collection(db, 'documents'));
      const documentsSnapshot = await getDocs(documentsQuery);
      const totalDocuments = documentsSnapshot.size;

      // Get active users (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeUsersQuery = query(
        collection(db, 'users'),
        where('lastActive', '>=', Timestamp.fromDate(thirtyDaysAgo)),
      );
      const activeUsersSnapshot = await getDocs(activeUsersQuery);
      const activeUsers = activeUsersSnapshot.size;

      // Calculate chat messages and other metrics
      let chatMessages = 0;
      conversationsSnapshot.forEach((doc) => {
        const data = doc.data();
        chatMessages += data.messages?.length || 0;
      });

      return {
        totalUsers,
        totalCompanies,
        totalConversations,
        totalDocuments,
        activeUsers,
        chatMessages,
        apiCalls: 0, // TODO: Implement API call tracking
        storageUsed: 0, // TODO: Implement storage tracking
      };
    } catch (error) {
      console.error('Error fetching platform analytics:', error);
      throw error;
    }
  }

  async getCompanyAnalytics(companyId: string): Promise<CompanyAnalytics> {
    try {
      // Get company users
      const usersQuery = query(
        collection(db, 'users'),
        where('companyId', '==', companyId),
      );
      const usersSnapshot = await getDocs(usersQuery);
      const employeeCount = usersSnapshot.size;

      // Get active employees (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let activeEmployees = 0;
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.lastActive && data.lastActive.toDate() >= thirtyDaysAgo) {
          activeEmployees++;
        }
      });

      // Get company documents
      const documentsQuery = query(
        collection(db, 'documents'),
        where('companyId', '==', companyId),
      );
      const documentsSnapshot = await getDocs(documentsQuery);
      const documentsCount = documentsSnapshot.size;

      // Get company conversations
      const conversationsQuery = query(
        collection(db, 'conversations'),
        where('companyId', '==', companyId),
      );
      const conversationsSnapshot = await getDocs(conversationsQuery);
      const conversationsCount = conversationsSnapshot.size;

      // Calculate monthly chats
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      let monthlyChats = 0;
      conversationsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.createdAt && data.createdAt.toDate() >= thisMonth) {
          monthlyChats++;
        }
      });

      // Calculate enrollment rate
      const enrollmentRate =
        employeeCount > 0
          ? Math.round((activeEmployees / employeeCount) * 100)
          : 0;

      return {
        companyId,
        employeeCount,
        activeEmployees,
        documentsCount,
        conversationsCount,
        monthlyChats,
        enrollmentRate,
        averageCostPerEmployee: 0, // TODO: Implement cost tracking
      };
    } catch (error) {
      console.error('Error fetching company analytics:', error);
      throw error;
    }
  }

  async getUserActivity(
    userId?: string,
    companyId?: string,
  ): Promise<UserActivity[]> {
    try {
      let usersQuery: any;

      if (userId) {
        usersQuery = query(collection(db, 'users'), where('uid', '==', userId));
      } else if (companyId) {
        usersQuery = query(
          collection(db, 'users'),
          where('companyId', '==', companyId),
          orderBy('lastActive', 'desc'),
          limit(50),
        );
      } else {
        usersQuery = query(
          collection(db, 'users'),
          orderBy('lastActive', 'desc'),
          limit(100),
        );
      }

      const usersSnapshot = await getDocs(usersQuery);
      const activities: UserActivity[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();

        // Get user's conversations
        const conversationsQuery = query(
          collection(db, 'conversations'),
          where('userId', '==', userDoc.id),
        );
        const conversationsSnapshot = await getDocs(conversationsQuery);

        let messageCount = 0;
        conversationsSnapshot.forEach((doc) => {
          const data = doc.data();
          messageCount += data.messages?.length || 0;
        });

        activities.push({
          userId: userDoc.id,
          userName: userData.displayName || userData.email || 'Unknown',
          lastActive: userData.lastActive?.toDate() || new Date(),
          conversationCount: conversationsSnapshot.size,
          messageCount,
          documentsViewed: userData.documentsViewed || 0,
        });
      }

      return activities;
    } catch (error) {
      console.error('Error fetching user activity:', error);
      throw error;
    }
  }

  async getChatAnalytics(companyId?: string): Promise<ChatAnalytics> {
    try {
      let conversationsQuery: any;

      if (companyId) {
        conversationsQuery = query(
          collection(db, 'conversations'),
          where('companyId', '==', companyId),
        );
      } else {
        conversationsQuery = query(collection(db, 'conversations'));
      }

      const conversationsSnapshot = await getDocs(conversationsQuery);

      let totalMessages = 0;
      const topQuestions: { [key: string]: number } = {};
      const hourlyActivity: { [key: number]: number } = {};

      conversationsSnapshot.forEach((doc) => {
        const data = doc.data();
        const messages = data.messages || [];
        totalMessages += messages.length;

        // Analyze messages for top questions
        messages.forEach((msg: any) => {
          if (msg.role === 'user' && msg.content) {
            const question = msg.content.substring(0, 100);
            topQuestions[question] = (topQuestions[question] || 0) + 1;
          }

          // Track hourly activity
          if (msg.createdAt) {
            const hour = new Date(msg.createdAt).getHours();
            hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
          }
        });
      });

      // Get top 5 questions
      const sortedQuestions = Object.entries(topQuestions)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([question]) => question);

      // Format peak hours
      const peakHours = Object.entries(hourlyActivity)
        .map(([hour, count]) => ({
          hour: Number.parseInt(hour),
          count,
        }))
        .sort((a, b) => a.hour - b.hour);

      const averageMessagesPerChat =
        conversationsSnapshot.size > 0
          ? Math.round(totalMessages / conversationsSnapshot.size)
          : 0;

      return {
        totalChats: conversationsSnapshot.size,
        averageMessagesPerChat,
        topQuestions: sortedQuestions,
        peakHours,
        averageResponseTime: 0, // TODO: Implement response time tracking
        satisfactionRate: 0, // TODO: Implement satisfaction tracking
      };
    } catch (error) {
      console.error('Error fetching chat analytics:', error);
      throw error;
    }
  }

  async getSystemMetrics() {
    try {
      // Get Firebase usage metrics
      // This would typically come from Firebase Admin SDK or monitoring APIs
      return {
        firestoreReads: 0,
        firestoreWrites: 0,
        storageBytes: 0,
        functionInvocations: 0,
        authUsers: 0,
        bandwidthBytes: 0,
      };
    } catch (error) {
      console.error('Error fetching system metrics:', error);
      throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();
