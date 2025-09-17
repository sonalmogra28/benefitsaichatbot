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
    logger.error('Error creating conversation', error, { userId, companyId });
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
    logger.error('Error getting conversation', error, { chatId, userId });
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
    logger.error('Error getting user conversations', error, { userId });
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
    logger.error('Error adding message', error, { chatId, userId, role });
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
    logger.error('Error getting messages', error, { chatId });
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
    logger.error('Failed to delete conversation', error, { chatId, userId });
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
    logger.error('Failed to update conversation title', error, { chatId, userId, title });
    return false;
  }
}

/**
 * Get conversation analytics
 */
export async function getConversationAnalytics(companyId: string) {
  try {
    const snapshot = await db
      .collection('chats')
      .where('companyId', '==', companyId)
      .get();

    const totalChats = snapshot.size;
    const uniqueUsers = new Set(snapshot.docs.map((doc) => doc.data().userId))
      .size;

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
