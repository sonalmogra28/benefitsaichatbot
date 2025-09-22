import { logger } from '@/lib/logger';
import { cosmosClient } from '@/lib/azure/cosmos';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface Conversation {
  id: string;
  userId: string;
  companyId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

class ConversationService {
  private container = cosmosClient.database('BenefitsDB').container('conversations');

  async addMessage(conversationId: string, message: Message): Promise<void> {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      conversation.messages.push(message);
      conversation.updatedAt = new Date();

      await this.container.item(conversationId).replace(conversation);
    } catch (error) {
      logger.error('Error adding message to conversation', { error, conversationId, messageId: message.id });
      throw error;
    }
  }

  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const { resource } = await this.container.item(conversationId).read<Conversation>();
      return resource || null;
    } catch (error) {
      if ((error as any).code === 404) {
        return null;
      }
      logger.error('Error fetching conversation', { error, conversationId });
      throw error;
    }
  }

  async createConversation(userId: string, companyId: string): Promise<Conversation> {
    try {
      const conversation: Conversation = {
        id: crypto.randomUUID(),
        userId,
        companyId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const { resource } = await this.container.items.create(conversation);
      return resource!;
    } catch (error) {
      logger.error('Error creating conversation', { error, userId, companyId });
      throw error;
    }
  }

  async getUserConversations(userId: string, companyId: string): Promise<Conversation[]> {
    try {
      const query = 'SELECT * FROM c WHERE c.userId = @userId AND c.companyId = @companyId ORDER BY c.updatedAt DESC';
      const { resources } = await this.container.items.query<Conversation>({
        query,
        parameters: [
          { name: '@userId', value: userId },
          { name: '@companyId', value: companyId }
        ]
      }).fetchAll();

      return resources;
    } catch (error) {
      logger.error('Error fetching user conversations', { error, userId, companyId });
      return [];
    }
  }
}

export const conversationService = new ConversationService();
