import { cookies } from 'next/headers';

import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { auth } from '../(auth)/stack-auth';
import { redirect } from 'next/navigation';

export default async function Page() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  // For admin users, show a simple redirect page instead of causing a loop
  if (session.user.type === 'platform_admin') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Welcome, Platform Admin</h1>
          <p className="mb-4">Redirecting to admin dashboard...</p>
          <a href="/admin" className="text-blue-500 hover:underline">
            Click here if not redirected
          </a>
          <script dangerouslySetInnerHTML={{ __html: 'window.location.href = "/admin";' }} />
        </div>
      </div>
    );
  } else if (session.user.type === 'company_admin' || session.user.type === 'hr_admin') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Welcome, {session.user.type === 'company_admin' ? 'Company' : 'HR'} Admin</h1>
          <p className="mb-4">Redirecting to admin dashboard...</p>
          <a href="/company-admin" className="text-blue-500 hover:underline">
            Click here if not redirected
          </a>
          <script dangerouslySetInnerHTML={{ __html: 'window.location.href = "/company-admin";' }} />
        </div>
      </div>
    );
  }

  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  if (!modelIdFromCookie) {
    return (
      <>
        <Chat
          key={id}
          id={id}
          initialMessages={[]}
          initialChatModel={DEFAULT_CHAT_MODEL}
          initialVisibilityType="private"
          isReadonly={false}
          session={session}
          autoResume={false}
        />
        <DataStreamHandler />
      </>
    );
  }

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        initialChatModel={modelIdFromCookie.value}
        initialVisibilityType="private"
        isReadonly={false}
        session={session}
        autoResume={false}
      />
      <DataStreamHandler />
    </>
  );
}
