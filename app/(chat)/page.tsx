'use client';

import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Page() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    // Check if we're in demo mode
    const authMode = sessionStorage.getItem('authMode');
    const mockUser = sessionStorage.getItem('mockUser');
    
    if (authMode === 'demo' && mockUser) {
      setIsDemoMode(true);
    }
  }, []);

  if (loading && !isDemoMode) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading chat interface...</p>
        </div>
      </div>
    );
  }

  if (!user && !isDemoMode) {
    router.push('/login');
    return null;
  }

  const id = generateUUID();
  const chatUser = isDemoMode ? { uid: 'demo-user', email: 'demo@test.com' } : user;

  return (
    <>
      {isDemoMode && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
            🎭 Demo Mode - Using mock data. Set up Firebase for full functionality.
          </p>
        </div>
      )}
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        initialChatModel={DEFAULT_CHAT_MODEL}
        initialVisibilityType="private"
        isReadonly={false}
        autoResume={false}
      />
      <DataStreamHandler />
    </>
  );
}
