import { getRepositories } from '@/lib/azure/cosmos';
import { logger } from '@/lib/logging/logger';
import type { ChatMessage } from '@/lib/types';

export interface ChatMessageDocument {
  id: string;
  chatId: string;
  userId: string;
  companyId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  metadata?: {
    model?: string;
    tokensUsed?: number;
    responseTime?: number;
    visibility?: 'private' | 'company' | 'public';
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}

export class ChatMessagesService {
  private messagesRepository: any;

  constructor() {
    this.initializeRepository();
  }

  private async initializeRepository() {
    const repositories = await getRepositories();
    this.messagesRepository = repositories.chats; // Using chats container for messages
  }

  async getChatMessages(chatId: string, userId: string): Promise<ChatMessage[]> {
    try {
      await this.initializeRepository();
      
      const query = `
        SELECT * FROM c 
        WHERE c.chatId = @chatId 
        AND c.userId = @userId 
        ORDER BY c.timestamp ASC
      `;
      
      const parameters = [
        { name: '@chatId', value: chatId },
        { name: '@userId', value: userId }
      ];
      
      const { resources } = await this.messagesRepository.query(query, parameters);
      
      // Convert to ChatMessage format
      const messages: ChatMessage[] = resources.map((doc: ChatMessageDocument) => ({
        id: doc.id,
        role: doc.role,
        content: doc.content,
        createdAt: doc.timestamp,
        metadata: doc.metadata
      }));
      
      logger.info('Chat messages loaded successfully', {
        chatId,
        userId,
        messageCount: messages.length
      });
      
      return messages;
    } catch (error) {
      logger.error('Failed to load chat messages', error, {
        chatId,
        userId
      });
      return [];
    }
  }

  async saveChatMessage(
    chatId: string,
    userId: string,
    companyId: string,
    message: Omit<ChatMessage, 'id' | 'createdAt'>
  ): Promise<ChatMessageDocument> {
    try {
      await this.initializeRepository();
      
      const messageDoc: ChatMessageDocument = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        chatId,
        userId,
        companyId,
        content: message.content,
        role: message.role,
        timestamp: new Date(),
        metadata: message.metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await this.messagesRepository.create(messageDoc);
      
      logger.info('Chat message saved successfully', {
        chatId,
        userId,
        messageId: messageDoc.id,
        role: message.role
      });
      
      return messageDoc;
    } catch (error) {
      logger.error('Failed to save chat message', error, {
        chatId,
        userId,
        role: message.role
      });
      throw error;
    }
  }

  async updateChatMessage(
    messageId: string,
    updates: Partial<Pick<ChatMessage, 'content' | 'metadata'>>
  ): Promise<void> {
    try {
      await this.initializeRepository();
      
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };
      
      await this.messagesRepository.update(messageId, updateData);
      
      logger.info('Chat message updated successfully', {
        messageId,
        updates: Object.keys(updates)
      });
    } catch (error) {
      logger.error('Failed to update chat message', error, {
        messageId,
        updates
      });
      throw error;
    }
  }

  async deleteChatMessage(messageId: string): Promise<void> {
    try {
      await this.initializeRepository();
      
      await this.messagesRepository.delete(messageId);
      
      logger.info('Chat message deleted successfully', {
        messageId
      });
    } catch (error) {
      logger.error('Failed to delete chat message', error, {
        messageId
      });
      throw error;
    }
  }

  async deleteChatMessages(chatId: string, userId: string): Promise<void> {
    try {
      await this.initializeRepository();
      
      const query = `
        SELECT * FROM c 
        WHERE c.chatId = @chatId 
        AND c.userId = @userId
      `;
      
      const parameters = [
        { name: '@chatId', value: chatId },
        { name: '@userId', value: userId }
      ];
      
      const { resources } = await this.messagesRepository.query(query, parameters);
      
      for (const message of resources) {
        await this.messagesRepository.delete(message.id);
      }
      
      logger.info('Chat messages deleted successfully', {
        chatId,
        userId,
        deletedCount: resources.length
      });
    } catch (error) {
      logger.error('Failed to delete chat messages', error, {
        chatId,
        userId
      });
      throw error;
    }
  }

  async getChatHistory(userId: string, limit: number = 50): Promise<{
    chatId: string;
    lastMessage: ChatMessage;
    messageCount: number;
    lastActivity: Date;
  }[]> {
    try {
      await this.initializeRepository();
      
      const query = `
        SELECT c.chatId, c.timestamp, c.content, c.role, c.metadata
        FROM c 
        WHERE c.userId = @userId 
        ORDER BY c.timestamp DESC
      `;
      
      const parameters = [
        { name: '@userId', value: userId }
      ];
      
      const { resources } = await this.messagesRepository.query(query, parameters);
      
      // Group messages by chatId
      const chatGroups: Record<string, any[]> = {};
      resources.forEach((msg: any) => {
        if (!chatGroups[msg.chatId]) {
          chatGroups[msg.chatId] = [];
        }
        chatGroups[msg.chatId].push(msg);
      });
      
      // Create chat history entries
      const chatHistory = Object.entries(chatGroups).map(([chatId, messages]) => {
        const sortedMessages = messages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        const lastMessage = sortedMessages[sortedMessages.length - 1];
        
        return {
          chatId,
          lastMessage: {
            id: lastMessage.id || `msg_${Date.now()}`,
            role: lastMessage.role,
            content: lastMessage.content,
            createdAt: lastMessage.timestamp,
            metadata: lastMessage.metadata
          },
          messageCount: sortedMessages.length,
          lastActivity: new Date(lastMessage.timestamp)
        };
      });
      
      // Sort by last activity and limit
      return chatHistory
        .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
        .slice(0, limit);
    } catch (error) {
      logger.error('Failed to get chat history', error, {
        userId,
        limit
      });
      return [];
    }
  }
}

// Export singleton instance
export const chatMessagesService = new ChatMessagesService();
