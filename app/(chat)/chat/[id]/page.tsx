import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { chatMessagesService } from '@/lib/services/chat-messages.service';
import type { ChatMessage } from '@/lib/types';

interface ChatPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;
  
  // Load messages from database
  // Note: In a real implementation, you'd need to get the userId from the session
  // For now, we'll use a placeholder userId
  const userId = 'placeholder-user-id'; // TODO: Get from session
  const messages = await chatMessagesService.getChatMessages(id, userId);

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