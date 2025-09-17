import { getRepositories } from '@/lib/azure/cosmos';
import { logger } from '@/lib/logging/logger';

export interface Chat {
  id: string;
  userId: string;
  companyId: string;
  title: string;
  visibility: 'private' | 'public';
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  chatId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

/**
 * Create a new conversation for a user
 */
export async function createConversation(
  userId: string,
  companyId: string,
  title?: string,
): Promise<Chat> {
  try {
    const repositories = await getRepositories();
    const chatsRepository = repositories.chats;

    const newChat: Chat = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      companyId,
      title: title || `Chat ${new Date().toLocaleDateString()}`,
      visibility: 'private' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await chatsRepository.create(newChat);

    logger.info('Conversation created successfully', {
      chatId: newChat.id,
      userId,
      companyId
    });

    return newChat;
  } catch (error) {
    logger.error('Error creating conversation', error as Error, { userId, companyId });
    throw new Error('Failed to create conversation');
  }
}

/**
 * Get a conversation by ID
 */
export async function getConversation(
  chatId: string,
  userId: string,
): Promise<Chat | null> {
  try {
    const repositories = await getRepositories();
    const chatsRepository = repositories.chats;

    const chat = await chatsRepository.getById(chatId);

    if (!chat) {
      logger.warn('Conversation not found', { chatId });
      return null;
    }

    // Verify the user owns this chat
    if (chat.userId !== userId) {
      logger.warn('User does not own this conversation', { chatId, userId });
      return null;
    }

    logger.info('Conversation retrieved successfully', { chatId, userId });
    return chat as Chat;
  } catch (error) {
    logger.error('Error getting conversation', error as Error, { chatId, userId });
    throw new Error('Failed to get conversation');
  }
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(
  userId: string,
  limit = 50,
): Promise<Chat[]> {
  try {
    const repositories = await getRepositories();
    const chatsRepository = repositories.chats;

    // Query conversations by userId
    const conversations = await chatsRepository.query(
      'SELECT * FROM c WHERE c.userId = @userId ORDER BY c.updatedAt DESC',
      [{ name: 'userId', value: userId }]
    );

    // Apply limit
    const limitedConversations = conversations.resources.slice(0, limit);

    logger.info('User conversations retrieved successfully', {
      userId,
      count: limitedConversations.length
    });

    return limitedConversations as Chat[];
  } catch (error) {
    logger.error('Error getting user conversations', error as Error, { userId });
    throw new Error('Failed to get user conversations');
  }
}

/**
 * Add a message to a conversation
 */
export async function addMessage(
  chatId: string,
  userId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
): Promise<Message> {
  try {
    const repositories = await getRepositories();
    const messagesRepository = repositories.messages;

    const newMessage: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chatId,
      userId,
      role,
      content,
      createdAt: new Date().toISOString(),
    };

    await messagesRepository.create(newMessage);

    // Update chat's updatedAt timestamp
    const chatsRepository = repositories.chats;
    const existingChat = await chatsRepository.getById(chatId);
    if (existingChat) {
      await chatsRepository.update(chatId, {
        ...existingChat,
        updatedAt: new Date().toISOString(),
      });
    }

    logger.info('Message added successfully', {
      messageId: newMessage.id,
      chatId,
      userId,
      role
    });

    return newMessage;
  } catch (error) {
    logger.error('Error adding message', error as Error, { chatId, userId, role });
    throw new Error('Failed to add message');
  }
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  chatId: string,
  limit = 100,
): Promise<Message[]> {
  try {
    const repositories = await getRepositories();
    const messagesRepository = repositories.messages;

    // Query messages by chatId
    const messages = await messagesRepository.query(
      'SELECT * FROM c WHERE c.chatId = @chatId ORDER BY c.createdAt ASC',
      [{ name: 'chatId', value: chatId }]
    );

    // Apply limit
    const limitedMessages = messages.resources.slice(0, limit);

    logger.info('Messages retrieved successfully', {
      chatId,
      count: limitedMessages.length
    });

    return limitedMessages as Message[];
  } catch (error) {
    logger.error('Error getting messages', error as Error, { chatId });
    throw new Error('Failed to get messages');
  }
}

/**
 * Delete a conversation and all its messages
 */
export async function deleteConversation(
  chatId: string,
  userId: string,
): Promise<boolean> {
  try {
    // Verify ownership
    const chat = await getConversation(chatId, userId);
    if (!chat) {
      logger.warn('Conversation not found or user does not own it', { chatId, userId });
      return false;
    }

    const repositories = await getRepositories();
    const messagesRepository = repositories.messages;
    const chatsRepository = repositories.chats;

    // Delete all messages first
    const messages = await messagesRepository.query(
      'SELECT * FROM c WHERE c.chatId = @chatId',
      [{ name: 'chatId', value: chatId }]
    );

    // Delete each message
    for (const message of messages.resources) {
      await messagesRepository.delete(message.id);
    }

    // Delete the chat document
    await chatsRepository.delete(chatId);

    logger.info('Conversation deleted successfully', {
      chatId,
      userId,
      messagesDeleted: messages.resources.length
    });

    return true;
  } catch (error) {
    logger.error('Failed to delete conversation', error as Error, { chatId, userId });
    return false;
  }
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  chatId: string,
  userId: string,
  title: string,
): Promise<boolean> {
  try {
    // Verify ownership
    const chat = await getConversation(chatId, userId);
    if (!chat) {
      logger.warn('Conversation not found or user does not own it', { chatId, userId });
      return false;
    }

    const repositories = await getRepositories();
    const chatsRepository = repositories.chats;

    await chatsRepository.update(chatId, {
      ...chat,
      title,
      updatedAt: new Date().toISOString(),
    });

    logger.info('Conversation title updated successfully', {
      chatId,
      userId,
      title
    });

    return true;
  } catch (error) {
    logger.error('Failed to update conversation title', error as Error, { chatId, userId, title });
    return false;
  }
}

/**
 * Get conversation analytics
 */
export async function getConversationAnalytics(companyId: string) {
  try {
    const repositories = await getRepositories();
    const query = `SELECT * FROM c WHERE c.companyId = @companyId`;
    const parameters = [{ name: '@companyId', value: companyId }];
    
    const { resources: chats } = await repositories.chats.query(query, parameters);
    const totalChats = chats.length;
    const uniqueUsers = new Set(chats.map((chat: any) => chat.userId)).size;

    // Get message counts
    let totalMessages = 0;
    for (const chatDoc of snapshot.docs) {
      const messagesSnapshot = await db
        .collection('chats')
        .doc(chatDoc.id)
        .collection('messages')
        .get();
      totalMessages += messagesSnapshot.size;
    }

    return {
      totalChats,
      uniqueUsers,
      totalMessages,
      averageMessagesPerChat:
        totalChats > 0 ? Math.round(totalMessages / totalChats) : 0,
    };
  } catch (error) {
    console.error('Failed to get conversation analytics:', error);
    return {
      totalChats: 0,
      uniqueUsers: 0,
      totalMessages: 0,
      averageMessagesPerChat: 0,
    };
  }
}

/**
 * Get conversation suggestions based on user's chat history
 */
export async function getSuggestions(
  userId: string,
  companyId: string,
  limit: number = 5
): Promise<string[]> {
  try {
    const repositories = await getRepositories();
    const chatsRepository = repositories.chats;

    // Get user's recent conversations
    const query = `SELECT * FROM c WHERE c.userId = @userId AND c.companyId = @companyId ORDER BY c.updatedAt DESC`;
    const parameters = [
      { name: '@userId', value: userId },
      { name: '@companyId', value: companyId }
    ];
    
    const { resources: chats } = await chatsRepository.query(query, parameters);

    // Generate suggestions based on common patterns
    const suggestions: string[] = [];

    // Common benefits questions
    const commonQuestions = [
      "What health insurance plans are available?",
      "How do I enroll in dental coverage?",
      "What is the 401k matching policy?",
      "When is open enrollment?",
      "How do I add a dependent?",
      "What is the HSA contribution limit?",
      "How do I change my benefits?",
      "What is covered under vision insurance?",
      "How do I find a doctor in my network?",
      "What is the deductible for my plan?"
    ];

    // Add some common questions
    suggestions.push(...commonQuestions.slice(0, limit));

    // If user has chat history, add personalized suggestions
    if (chats.length > 0) {
      // Add suggestions based on recent chat titles
      const recentTitles = chats.slice(0, 3).map(chat => chat.title);
      const personalizedSuggestions = recentTitles.map(title => 
        `Tell me more about ${title.toLowerCase()}`
      );
      suggestions.push(...personalizedSuggestions);
    }

    // Add company-specific suggestions
    const companySuggestions = [
      "What are the company's wellness programs?",
      "How do I access my benefits portal?",
      "What is the employee assistance program?",
      "How do I submit a benefits claim?",
      "What is the company's retirement plan?"
    ];

    suggestions.push(...companySuggestions);

    // Remove duplicates and limit results
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, limit);

    logger.info('Conversation suggestions generated', {
      userId,
      companyId,
      suggestionCount: uniqueSuggestions.length
    });

    return uniqueSuggestions;
  } catch (error) {
    logger.error('Error generating conversation suggestions', error as Error, {
      userId,
      companyId
    });
    
    // Return fallback suggestions
    return [
      "What health insurance plans are available?",
      "How do I enroll in dental coverage?",
      "What is the 401k matching policy?",
      "When is open enrollment?",
      "How do I add a dependent?"
    ].slice(0, limit);
  }
}