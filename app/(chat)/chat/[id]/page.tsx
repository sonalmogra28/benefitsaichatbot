import { notFound } from 'next/navigation';
import { Chat } from '@/components/chat';
import { adminAuth } from '@/lib/firebase/admin';
import { getConversation } from '@/lib/firebase/services/conversation.service';

interface ChatPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: ChatPageProps) {
  return {
    title: 'Benefits Chat',
    description: 'Chat with your AI benefits assistant'
  };
}

export default async function ChatPage({ params }: ChatPageProps) {
  // Get the current user session
  const session = await adminAuth.verifyIdToken(
    // TODO: Get token from cookies/headers
    ''
  ).catch(() => null);

  if (!session) {
    notFound();
  }

  // Verify the user has access to this conversation
  const conversation = await getConversation(params.id, session.uid);
  
  if (!conversation) {
    notFound();
  }

  return (
    <Chat 
      id={params.id}
      initialMessages={conversation.messages || []}
      initialChatModel="gemini-2.0-flash-exp"
      initialVisibilityType="private"
      isReadonly={false}
      autoResume={false}
    />
  );
}