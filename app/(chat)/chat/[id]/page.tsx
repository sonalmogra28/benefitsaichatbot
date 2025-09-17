import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import type { ChatMessage } from '@/lib/types';

interface ChatPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;
  const messages: ChatMessage[] = []; // TODO: Load messages from database

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