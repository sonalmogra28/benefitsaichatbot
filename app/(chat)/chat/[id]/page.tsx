'use client';

import { useEffect, useState } from 'react';
import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import type { ChatMessage } from '@/lib/types';

interface ChatPageProps {
  params: {
    id: string;
  };
}
export default function ChatPage({ params }: ChatPageProps) {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      try {
        const messagesQuery = query(
          collection(db, `conversations/${params.id}/messages`),
          orderBy('createdAt', 'asc')
        );
        const snapshot = await getDocs(messagesQuery);
        const history: ChatMessage[] = snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          return {
            id: data.id || doc.id,
            role: data.role,
            parts: [{ type: 'text', text: data.content }],
            metadata: data.createdAt
              ? { createdAt: data.createdAt.toDate().toISOString() }
              : undefined,
          };
        });
        setMessages(history);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [user, params.id]);

  if (loading || !user || isLoadingMessages) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full size-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  // Verify the user has access to this conversation
  const conversation = await getConversation(params.id, session.uid);

  if (!conversation) {
    notFound();
  }

  return (
    <Chat
      id={params.id}
      initialMessages={messages}
      initialChatModel={DEFAULT_CHAT_MODEL}
      initialVisibilityType="private"
      isReadonly={false}
      autoResume={false}
    />
  );
}

