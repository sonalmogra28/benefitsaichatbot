import { auth } from '@/app/(auth)/stack-auth';
import { stackServerApp } from '@/stack';
import { cookies } from 'next/headers';

export default async function AuthDebugPage() {
  const session = await auth();
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  
  let stackUser = null;
  let stackError = null;
  
  try {
    stackUser = await stackServerApp.getUser();
  } catch (error) {
    stackError = error instanceof Error ? error.message : 'Unknown error';
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Auth Debug Information</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Session Information</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Stack User (Direct)</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {stackUser ? JSON.stringify(stackUser, null, 2) : 'No user found'}
          </pre>
          {stackError && (
            <p className="text-red-600 mt-2">Error: {stackError}</p>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Cookies</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' })), null, 2)}
          </pre>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Environment Check</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Stack Project ID: {process.env.NEXT_PUBLIC_STACK_PROJECT_ID ? '✓ Set' : '✗ Missing'}</li>
            <li>Stack Publishable Key: {process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY ? '✓ Set' : '✗ Missing'}</li>
            <li>Stack Secret Key: {process.env.STACK_SECRET_SERVER_KEY ? '✓ Set' : '✗ Missing'}</li>
          </ul>
        </div>

        <div className="flex gap-4">
          <a href="/login" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Go to Login
          </a>
          <a href="/register" className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
            Go to Register
          </a>
          <a href="/" className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
            Go to Home
          </a>
        </div>
      </div>
    </div>
  );
}