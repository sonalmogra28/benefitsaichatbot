import { db } from '@/lib/db';
import { chatAnalytics, analyticsEvents, chats, messages, users } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, desc, count, countDistinct } from 'drizzle-orm';

export interface ChatAnalyticsData {
  // Usage metrics
  totalConversations: number;
  totalMessages: number;
  uniqueUsers: number;
  avgMessagesPerConversation: number;
  
  // Performance metrics
  avgResponseTime: number;
  avgTokensPerResponse: number;
  errorRate: number;
  
  // Quality metrics
  positiveFeedback: number;
  negativeFeedback: number;
  neutralFeedback: number;
  feedbackRate: number;
  
  // Cost metrics
  totalCost: number;
  avgCostPerConversation: number;
  costByModel: Record<string, number>;
  
  // Tool usage
  toolUsageCount: Record<string, number>;
  
  // Time-based metrics
  messagesByHour: Array<{ hour: number; count: number }>;
  messagesByDay: Array<{ date: string; count: number }>;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Get comprehensive chat analytics for a company
 */
export async function getChatAnalytics(
  companyId: string,
  dateRange?: DateRange
): Promise<ChatAnalyticsData> {
  const conditions = [eq(chatAnalytics.companyId, companyId)];
  
  if (dateRange) {
    conditions.push(
      gte(chatAnalytics.createdAt, dateRange.startDate),
      lte(chatAnalytics.createdAt, dateRange.endDate)
    );
  }

  // Get basic counts
  const [basicStats] = await db
    .select({
      totalMessages: count(chatAnalytics.id),
      uniqueUsers: countDistinct(chatAnalytics.userId),
      totalErrors: count(sql`CASE WHEN ${chatAnalytics.errorOccurred} THEN 1 END`),
      positiveFeedback: count(sql`CASE WHEN ${chatAnalytics.feedback} = 'positive' THEN 1 END`),
      negativeFeedback: count(sql`CASE WHEN ${chatAnalytics.feedback} = 'negative' THEN 1 END`),
      neutralFeedback: count(sql`CASE WHEN ${chatAnalytics.feedback} = 'neutral' THEN 1 END`),
      totalFeedback: count(sql`CASE WHEN ${chatAnalytics.feedback} IS NOT NULL THEN 1 END`),
    })
    .from(chatAnalytics)
    .where(and(...conditions));

  // Get conversation count
  const conversationConditions = [eq(chats.companyId, companyId)];
  if (dateRange) {
    conversationConditions.push(
      gte(chats.createdAt, dateRange.startDate),
      lte(chats.createdAt, dateRange.endDate)
    );
  }

  const [conversationStats] = await db
    .select({
      totalConversations: count(chats.id),
    })
    .from(chats)
    .where(and(...conversationConditions));

  // Get performance metrics
  const [performanceStats] = await db
    .select({
      avgResponseTime: sql<number>`avg(${chatAnalytics.responseTime})::float`,
      avgTokensPerResponse: sql<number>`avg(${chatAnalytics.tokensUsed})::float`,
      totalCost: sql<number>`sum(${chatAnalytics.cost})::float`,
    })
    .from(chatAnalytics)
    .where(and(...conditions));

  // Get tool usage
  const toolUsage = await db
    .select({
      toolName: chatAnalytics.toolName,
      count: count(),
    })
    .from(chatAnalytics)
    .where(and(
      ...conditions,
      eq(chatAnalytics.eventType, 'tool_used'),
      sql`${chatAnalytics.toolName} IS NOT NULL`
    ))
    .groupBy(chatAnalytics.toolName);

  // Get messages by hour
  const messagesByHour = await db
    .select({
      hour: sql<number>`extract(hour from ${chatAnalytics.createdAt})::int`,
      count: count(),
    })
    .from(chatAnalytics)
    .where(and(...conditions, eq(chatAnalytics.eventType, 'message_sent')))
    .groupBy(sql`extract(hour from ${chatAnalytics.createdAt})`)
    .orderBy(sql`extract(hour from ${chatAnalytics.createdAt})`);

  // Get messages by day (last 30 days)
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  
  const messagesByDay = await db
    .select({
      date: sql<string>`date(${chatAnalytics.createdAt})`,
      count: count(),
    })
    .from(chatAnalytics)
    .where(and(
      eq(chatAnalytics.companyId, companyId),
      eq(chatAnalytics.eventType, 'message_sent'),
      gte(chatAnalytics.createdAt, last30Days)
    ))
    .groupBy(sql`date(${chatAnalytics.createdAt})`)
    .orderBy(sql`date(${chatAnalytics.createdAt})`);

  // Calculate derived metrics
  const avgMessagesPerConversation = conversationStats.totalConversations > 0
    ? basicStats.totalMessages / conversationStats.totalConversations
    : 0;

  const errorRate = basicStats.totalMessages > 0
    ? (basicStats.totalErrors / basicStats.totalMessages) * 100
    : 0;

  const feedbackRate = basicStats.totalMessages > 0
    ? (basicStats.totalFeedback / basicStats.totalMessages) * 100
    : 0;

  const avgCostPerConversation = conversationStats.totalConversations > 0
    ? performanceStats.totalCost / conversationStats.totalConversations
    : 0;

  // Convert tool usage to object
  const toolUsageCount: Record<string, number> = {};
  toolUsage.forEach(t => {
    if (t.toolName) {
      toolUsageCount[t.toolName] = t.count;
    }
  });

  return {
    totalConversations: conversationStats.totalConversations,
    totalMessages: basicStats.totalMessages,
    uniqueUsers: basicStats.uniqueUsers,
    avgMessagesPerConversation,
    avgResponseTime: performanceStats.avgResponseTime || 0,
    avgTokensPerResponse: performanceStats.avgTokensPerResponse || 0,
    errorRate,
    positiveFeedback: basicStats.positiveFeedback,
    negativeFeedback: basicStats.negativeFeedback,
    neutralFeedback: basicStats.neutralFeedback,
    feedbackRate,
    totalCost: performanceStats.totalCost || 0,
    avgCostPerConversation,
    costByModel: {}, // TODO: Implement when we track model info
    toolUsageCount,
    messagesByHour: messagesByHour as any,
    messagesByDay: messagesByDay as any,
  };
}

/**
 * Get top questions asked
 */
export async function getTopQuestions(
  companyId: string,
  limit = 10,
  dateRange?: DateRange
): Promise<Array<{ question: string; count: number }>> {
  const conditions = [
    eq(messages.role, 'user'),
    eq(chats.companyId, companyId),
  ];

  if (dateRange) {
    conditions.push(
      gte(messages.createdAt, dateRange.startDate),
      lte(messages.createdAt, dateRange.endDate)
    );
  }

  // This is a simplified version - in production, you might want to:
  // 1. Use NLP to group similar questions
  // 2. Extract key topics
  // 3. Use vector similarity for clustering
  const questions = await db
    .select({
      content: messages.parts,
      chatId: messages.chatId,
    })
    .from(messages)
    .innerJoin(chats, eq(chats.id, messages.chatId))
    .where(and(...conditions))
    .limit(1000); // Sample recent messages

  // Simple frequency count of exact messages
  const questionCounts = new Map<string, number>();
  
  questions.forEach(q => {
    // Extract text from parts structure
    const text = q.content?.[0]?.text || '';
    if (text && text.length > 10) { // Filter out very short messages
      const normalized = text.toLowerCase().trim();
      questionCounts.set(normalized, (questionCounts.get(normalized) || 0) + 1);
    }
  });

  // Sort by frequency and return top N
  return Array.from(questionCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([question, count]) => ({ question, count }));
}

/**
 * Track a generic analytics event
 */
export async function trackEvent(event: {
  companyId: string;
  userId?: string;
  eventType: string;
  eventData?: any;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  await db.insert(analyticsEvents).values(event);
}

/**
 * Get user activity summary
 */
export async function getUserActivity(
  userId: string,
  companyId: string,
  days = 30
): Promise<{
  totalChats: number;
  totalMessages: number;
  lastActive: Date | null;
  favoriteTools: string[];
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [stats] = await db
    .select({
      totalChats: countDistinct(chatAnalytics.chatId),
      totalMessages: count(chatAnalytics.id),
      lastActive: sql<Date>`max(${chatAnalytics.createdAt})`,
    })
    .from(chatAnalytics)
    .where(and(
      eq(chatAnalytics.userId, userId),
      eq(chatAnalytics.companyId, companyId),
      gte(chatAnalytics.createdAt, startDate)
    ));

  const toolUsage = await db
    .select({
      toolName: chatAnalytics.toolName,
      count: count(),
    })
    .from(chatAnalytics)
    .where(and(
      eq(chatAnalytics.userId, userId),
      eq(chatAnalytics.companyId, companyId),
      eq(chatAnalytics.eventType, 'tool_used'),
      sql`${chatAnalytics.toolName} IS NOT NULL`,
      gte(chatAnalytics.createdAt, startDate)
    ))
    .groupBy(chatAnalytics.toolName)
    .orderBy(desc(count()))
    .limit(5);

  return {
    totalChats: stats.totalChats,
    totalMessages: stats.totalMessages,
    lastActive: stats.lastActive,
    favoriteTools: toolUsage.map(t => t.toolName!).filter(Boolean),
  };
}

/**
 * Calculate cost breakdown
 */
export async function getCostBreakdown(
  companyId: string,
  dateRange?: DateRange
): Promise<{
  daily: Array<{ date: string; cost: number }>;
  byUser: Array<{ userId: string; userEmail: string; cost: number }>;
  total: number;
}> {
  const conditions = [eq(chatAnalytics.companyId, companyId)];
  
  if (dateRange) {
    conditions.push(
      gte(chatAnalytics.createdAt, dateRange.startDate),
      lte(chatAnalytics.createdAt, dateRange.endDate)
    );
  }

  // Daily costs
  const dailyCosts = await db
    .select({
      date: sql<string>`date(${chatAnalytics.createdAt})`,
      cost: sql<number>`sum(${chatAnalytics.cost})::float`,
    })
    .from(chatAnalytics)
    .where(and(...conditions))
    .groupBy(sql`date(${chatAnalytics.createdAt})`)
    .orderBy(sql`date(${chatAnalytics.createdAt})`);

  // Cost by user
  const userCosts = await db
    .select({
      userId: chatAnalytics.userId,
      userEmail: users.email,
      cost: sql<number>`sum(${chatAnalytics.cost})::float`,
    })
    .from(chatAnalytics)
    .leftJoin(users, eq(users.id, chatAnalytics.userId))
    .where(and(...conditions))
    .groupBy(chatAnalytics.userId, users.email)
    .orderBy(desc(sql`sum(${chatAnalytics.cost})`))
    .limit(20);

  // Total cost
  const [totalCost] = await db
    .select({
      total: sql<number>`sum(${chatAnalytics.cost})::float`,
    })
    .from(chatAnalytics)
    .where(and(...conditions));

  return {
    daily: dailyCosts as any,
    byUser: userCosts as any,
    total: totalCost.total || 0,
  };
}