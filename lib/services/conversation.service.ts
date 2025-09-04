import { db } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface Chat {
  id: string;
  userId: string;
  companyId: string;
  title: string;
  visibility: 'private' | 'public';
  createdAt: any;
  updatedAt: any;
}

export interface Message {
  id: string;
  chatId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: any;
}

/**
 * Create a new conversation for a user
 */
export async function createConversation(
  userId: string,
  companyId: string,
  title?: string,
): Promise<Chat> {
  const chatRef = db.collection('chats').doc();

  const newChat = {
    id: chatRef.id,
    userId,
    companyId,
    title: title || `Chat ${new Date().toLocaleDateString()}`,
    visibility: 'private' as const,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await chatRef.set(newChat);

  return {
    ...newChat,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Get a conversation by ID
 */
export async function getConversation(
  chatId: string,
  userId: string,
): Promise<Chat | null> {
  const chatDoc = await db.collection('chats').doc(chatId).get();

  if (!chatDoc.exists) {
    return null;
  }

  const chat = chatDoc.data() as Chat;

  // Verify the user owns this chat
  if (chat.userId !== userId) {
    return null;
  }

  return {
    ...chat,
    id: chatDoc.id,
  };
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(
  userId: string,
  limit = 50,
): Promise<Chat[]> {
  const snapshot = await db
    .collection('chats')
    .where('userId', '==', userId)
    .orderBy('updatedAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as Chat,
  );
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
  const messageRef = db
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .doc();

  const newMessage = {
    id: messageRef.id,
    chatId,
    userId,
    role,
    content,
    createdAt: FieldValue.serverTimestamp(),
  };

  await messageRef.set(newMessage);

  // Update chat's updatedAt timestamp
  await db.collection('chats').doc(chatId).update({
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    ...newMessage,
    createdAt: new Date(),
  };
}

/**
 * Get messages for a conversation
 */
export async function getMessages(
  chatId: string,
  limit = 100,
): Promise<Message[]> {
  const snapshot = await db
    .collection('chats')
    .doc(chatId)
    .collection('messages')
    .orderBy('createdAt', 'asc')
    .limit(limit)
    .get();

  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as Message,
  );
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
      return false;
    }

    // Delete all messages first
    const messagesSnapshot = await db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .get();

    const batch = db.batch();

    messagesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    // Delete the chat document
    batch.delete(db.collection('chats').doc(chatId));

    await batch.commit();

    return true;
  } catch (error) {
    console.error('Failed to delete conversation:', error);
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
      return false;
    }

    await db.collection('chats').doc(chatId).update({
      title,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('Failed to update conversation title:', error);
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
