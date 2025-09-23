import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { chatMessagesService } from '@/lib/services/chat-messages.service';
import { getServerUser } from '@/lib/auth/server-auth';
import { redirect } from 'next/navigation';
import type { ChatMessage } from '@/lib/types';

interface ChatPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;
  
  // Get authenticated user from server context
  const user = await getServerUser();
  
  if (!user) {
    // Redirect to login if not authenticated
    redirect('/login');
  }

  // Load messages from database using authenticated user ID
  const messages = await chatMessagesService.getChatMessages(id, user.id);

  return (
    <Chat
      id={id}
      initialMessages={messages}
      initialChatModel={DEFAULT_CHAT_MODEL}
      initialVisibilityType="private"
      isReadonly={false}
      autoResume={false}
    />
  );
}