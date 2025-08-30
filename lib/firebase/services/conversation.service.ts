import { adminDb, FieldValue as AdminFieldValue } from '@/lib/firebase/admin';
import { z } from 'zod';
import type { FieldValue } from 'firebase-admin/firestore';

// Message schema
export const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

export type Message = z.infer<typeof messageSchema> & {
  id: string;
  createdAt: FieldValue | Date;
};

// Conversation schema
export const conversationSchema = z.object({
  userId: z.string(),
  companyId: z.string(),
  title: z.string().optional(),
  visibility: z.enum(['private', 'public']).default('private'),
});

export type Conversation = z.infer<typeof conversationSchema> & {
  id: string;
  createdAt: FieldValue | Date;
  updatedAt: FieldValue | Date;
};

/**
 * Service for managing conversation data in Firebase
 */
export class ConversationService {
  /**
   * Create a new conversation
   */
  async createConversation(
    conversationData: z.infer<typeof conversationSchema>
  ): Promise<string> {
    try {
      const validated = conversationSchema.parse(conversationData);
      
      const conversationRef = adminDb.collection('conversations').doc();
      const conversationId = conversationRef.id;

      await conversationRef.set({
        id: conversationId,
        ...validated,
        createdAt: AdminFieldValue.serverTimestamp(),
        updatedAt: AdminFieldValue.serverTimestamp()
      });

      return conversationId;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Invalid conversation data:', error.errors);
        throw new Error('Invalid conversation data format');
      }
      console.error('Failed to create conversation:', error);
      throw error;
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation | null> {
    try {
      const conversationDoc = await adminDb.collection('conversations').doc(conversationId).get();
      
      if (!conversationDoc.exists) {
        return null;
      }

      return conversationDoc.data() as Conversation;
    } catch (error) {
      console.error(`Failed to get conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(
    conversationId: string,
    messageData: z.infer<typeof messageSchema>
  ): Promise<string> {
    try {
      const validated = messageSchema.parse(messageData);
      
      const messageRef = adminDb.collection('conversations').doc(conversationId).collection('messages').doc();
      const messageId = messageRef.id;

      await messageRef.set({
        id: messageId,
        ...validated,
        createdAt: AdminFieldValue.serverTimestamp(),
      });

      await adminDb.collection('conversations').doc(conversationId).update({
        updatedAt: AdminFieldValue.serverTimestamp(),
      });

      return messageId;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Invalid message data:', error.errors);
        throw new Error('Invalid message data format');
      }
      console.error('Failed to add message:', error);
      throw error;
    }
  }

  /**
   * Get messages from a conversation
   */
  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const snapshot = await adminDb.collection('conversations').doc(conversationId).collection('messages').orderBy('createdAt', 'asc').get();
      return snapshot.docs.map(doc => doc.data() as Message);
    } catch (error) {
      console.error(`Failed to get messages for conversation ${conversationId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const conversationService = new ConversationService();

// Helper function for backward compatibility
export async function getConversation(conversationId: string, userId: string): Promise<any> {
  try {
    const conversation = await conversationService.getConversation(conversationId);
    
    // Verify user has access to this conversation
    if (conversation && conversation.userId === userId) {
      const messages = await conversationService.getMessages(conversationId);
      return {
        ...conversation,
        messages
      };
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get conversation:', error);
    return null;
  }
}