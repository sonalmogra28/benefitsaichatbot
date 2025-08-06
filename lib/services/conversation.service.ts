import { db } from '@/lib/db';
import { chats, messages, chatAnalytics, type Chat, type Message } from '@/lib/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

/**
 * Create a new conversation for a user
 */
export async function createConversation(userId: string, companyId: string, title?: string): Promise<Chat> {
  const [newChat] = await db.insert(chats).values({
    userId,
    companyId,
    title: title || `Chat ${new Date().toLocaleDateString()}`,
    visibility: 'private',
  }).returning();

  return newChat;
}

/**
 * Get a conversation by ID
 */
export async function getConversation(chatId: string, userId: string): Promise<Chat | null> {
  const [chat] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .limit(1);

  return chat || null;
}

/**
 * Add a message to a conversation
 */
export async function addMessage(
  chatId: string,
  message: {
    role: 'user' | 'assistant' | 'system';
    content: string;
    parts?: any;
    attachments?: any[];
  }
): Promise<Message> {
  const [newMessage] = await db.insert(messages).values({
    chatId,
    role: message.role,
    parts: message.parts || [{ type: 'text', text: message.content }],
    attachments: message.attachments || [],
  }).returning();

  return newMessage;
}

/**
 * Get messages for a conversation
 */
export async function getMessages(chatId: string, limit = 50): Promise<Message[]> {
  return await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(messages.createdAt)
    .limit(limit);
}

/**
 * Get conversation history for a user
 */
export async function getConversationHistory(
  userId: string,
  companyId: string,
  limit = 20
): Promise<Array<Chat & { messageCount: number; lastMessage: Date | null }>> {
  const result = await db
    .select({
      id: chats.id,
      userId: chats.userId,
      companyId: chats.companyId,
      title: chats.title,
      visibility: chats.visibility,
      createdAt: chats.createdAt,
      messageCount: sql<number>`count(${messages.id})::int`,
      lastMessage: sql<Date | null>`max(${messages.createdAt})`,
    })
    .from(chats)
    .leftJoin(messages, eq(messages.chatId, chats.id))
    .where(and(eq(chats.userId, userId), eq(chats.companyId, companyId)))
    .groupBy(chats.id)
    .orderBy(desc(sql`max(${messages.createdAt})`))
    .limit(limit);

  return result as any;
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(chatId: string, userId: string, title: string): Promise<boolean> {
  const result = await db
    .update(chats)
    .set({ title })
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));

  return result.length > 0;
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(chatId: string, userId: string): Promise<boolean> {
  const result = await db
    .delete(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)));

  return result.length > 0;
}

/**
 * Track chat analytics event
 */
export async function trackChatEvent(event: {
  companyId: string;
  userId?: string;
  chatId?: string;
  messageId?: string;
  eventType: 'message_sent' | 'tool_used' | 'feedback_given' | 'error';
  toolName?: string;
  responseTime?: number;
  tokensUsed?: number;
  cost?: number;
  feedback?: 'positive' | 'negative' | 'neutral';
  errorOccurred?: boolean;
  metadata?: any;
}) {
  await db.insert(chatAnalytics).values({
    companyId: event.companyId,
    userId: event.userId,
    chatId: event.chatId,
    messageId: event.messageId,
    eventType: event.eventType,
    toolName: event.toolName,
    responseTime: event.responseTime,
    tokensUsed: event.tokensUsed,
    cost: event.cost?.toString(),
    feedback: event.feedback,
    errorOccurred: event.errorOccurred || false,
    metadata: event.metadata || {},
  });
}

/**
 * Get or create a conversation for continuous chat
 */
export async function getOrCreateConversation(
  userId: string,
  companyId: string,
  conversationId?: string
): Promise<Chat> {
  // If conversationId provided, try to get it
  if (conversationId) {
    const existing = await getConversation(conversationId, userId);
    if (existing) return existing;
  }

  // Otherwise create a new conversation
  return await createConversation(userId, companyId);
}

/**
 * Search conversations by content
 */
export async function searchConversations(
  userId: string,
  companyId: string,
  searchTerm: string,
  limit = 20
): Promise<Chat[]> {
  // This is a simple implementation - for production, consider full-text search
  const results = await db
    .selectDistinct({ chat: chats })
    .from(chats)
    .innerJoin(messages, eq(messages.chatId, chats.id))
    .where(
      and(
        eq(chats.userId, userId),
        eq(chats.companyId, companyId),
        sql`${messages.parts}::text ILIKE ${`%${searchTerm}%`}`
      )
    )
    .limit(limit);

  return results.map(r => r.chat);
}