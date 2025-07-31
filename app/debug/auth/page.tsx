import { auth } from '@/app/(auth)/stack-auth';
import { stackServerApp } from '@/stack';
import { headers, cookies } from 'next/headers';
import Link from 'next/link';

export default async function AuthDebugPage() {
  // Get auth session
  let authSession = null;
  let authError = null;
  try {
    authSession = await auth();
  } catch (error) {
    authError = error instanceof Error ? error.message : 'Unknown error';
  }

  // Get Stack user directly
  let stackUser = null;
  let stackError = null;
  try {
    stackUser = await stackServerApp.getUser();
  } catch (error) {
    stackError = error instanceof Error ? error.message : 'Unknown error';
  }

  // Get cookies
  const cookieStore = cookies();
  const stackCookies = {
    'stack-access': cookieStore.get('stack-access')?.value || 'Not found',
    'stack-refresh': cookieStore.get('stack-refresh')?.value || 'Not found',
    'stack-access-token':
      cookieStore.get('stack-access-token')?.value || 'Not found',
    'stack-refresh-token':
      cookieStore.get('stack-refresh-token')?.value || 'Not found',
  };

  // Get headers
  const headersList = headers();
  const relevantHeaders = {
    'user-agent': headersList.get('user-agent') || 'Not found',
    host: headersList.get('host') || 'Not found',
    'x-forwarded-for': headersList.get('x-forwarded-for') || 'Not found',
  };

  // Environment variables (masked for security)
  const envVars = {
    NEXT_PUBLIC_STACK_PROJECT_ID: process.env.NEXT_PUBLIC_STACK_PROJECT_ID
      ? '✓ Set'
      : '✗ Not set',
    NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY: process.env
      .NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY
      ? '✓ Set'
      : '✗ Not set',
    STACK_SECRET_SERVER_KEY: process.env.STACK_SECRET_SERVER_KEY
      ? '✓ Set'
      : '✗ Not set',
    DATABASE_URL: process.env.DATABASE_URL ? '✓ Set' : '✗ Not set',
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Authentication Debug Page</h1>

      {/* Auth Session Status */}
      <section className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Auth Session Status</h2>
        {authError ? (
          <div className="p-4 bg-red-100 text-red-700 rounded">
            <p className="font-medium">Auth Error:</p>
            <p className="text-sm">{authError}</p>
          </div>
        ) : authSession?.user ? (
          <div className="space-y-2">
            <p className="text-green-600 font-medium">✓ Authenticated</p>
            <div className="pl-4 space-y-1 text-sm">
              <p>
                <span className="font-medium">User ID:</span>{' '}
                {authSession.user.id}
              </p>
              <p>
                <span className="font-medium">Email:</span>{' '}
                {authSession.user.email}
              </p>
              <p>
                <span className="font-medium">Name:</span>{' '}
                {authSession.user.name || 'Not set'}
              </p>
              <p>
                <span className="font-medium">Type:</span>{' '}
                {authSession.user.type}
              </p>
              <p>
                <span className="font-medium">Company ID:</span>{' '}
                {authSession.user.companyId || 'Not set'}
              </p>
              <p>
                <span className="font-medium">Stack User ID:</span>{' '}
                {authSession.user.stackUserId}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-yellow-600">⚠ Not authenticated</p>
        )}
      </section>

      {/* Stack User Status */}
      <section className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Stack Auth User Status</h2>
        {stackError ? (
          <div className="p-4 bg-red-100 text-red-700 rounded">
            <p className="font-medium">Stack Error:</p>
            <p className="text-sm">{stackError}</p>
          </div>
        ) : stackUser ? (
          <div className="space-y-2">
            <p className="text-green-600 font-medium">✓ Stack User Found</p>
            <div className="pl-4 space-y-1 text-sm">
              <p>
                <span className="font-medium">ID:</span> {stackUser.id}
              </p>
              <p>
                <span className="font-medium">Email:</span>{' '}
                {stackUser.primaryEmail || 'Not set'}
              </p>
              <p>
                <span className="font-medium">Email Verified:</span>{' '}
                {stackUser.primaryEmailVerified ? 'Yes' : 'No'}
              </p>
              <p>
                <span className="font-medium">Display Name:</span>{' '}
                {stackUser.displayName || 'Not set'}
              </p>
              <p>
                <span className="font-medium">Created:</span>{' '}
                {new Date(stackUser.signedUpAt).toLocaleString()}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-yellow-600">⚠ No Stack user found</p>
        )}
      </section>

      {/* Cookies */}
      <section className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Stack Auth Cookies</h2>
        <div className="space-y-2 text-sm">
          {Object.entries(stackCookies).map(([name, value]) => (
            <div key={name} className="flex">
              <span className="font-medium w-48">{name}:</span>
              <span
                className={
                  value === 'Not found' ? 'text-red-600' : 'text-green-600'
                }
              >
                {value === 'Not found' ? '✗ Not found' : '✓ Present (hidden)'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Environment Variables */}
      <section className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Environment Variables</h2>
        <div className="space-y-2 text-sm">
          {Object.entries(envVars).map(([name, status]) => (
            <div key={name} className="flex">
              <span className="font-medium w-64">{name}:</span>
              <span
                className={
                  status.includes('✓') ? 'text-green-600' : 'text-red-600'
                }
              >
                {status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Test Actions */}
      <section className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Test Actions</h2>
        <div className="space-x-4">
          <Link
            href="/login"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test Sign In
          </Link>
          <Link
            href="/register"
            className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Test Sign Up
          </Link>
          <Link
            href="/handler/sign-out"
            className="inline-block px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Test Sign Out
          </Link>
          <Link
            href="/admin"
            className="inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Test Protected Route
          </Link>
        </div>
      </section>

      {/* Debug Info */}
      <section className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Request Headers</h2>
        <div className="space-y-2 text-sm">
          {Object.entries(relevantHeaders).map(([name, value]) => (
            <div key={name} className="flex">
              <span className="font-medium w-48">{name}:</span>
              <span className="text-gray-600">{value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Instructions */}
      <section className="p-6 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Debugging Instructions</h2>
        <ul className="list-disc list-inside space-y-2 text-sm">
          <li>
            If &quot;Auth Session Status&quot; shows authenticated but
            &quot;Stack User Status&quot; doesn&apos;t, there&apos;s a sync
            issue
          </li>
          <li>
            If cookies are missing, Stack Auth isn&apos;t setting them properly
          </li>
          <li>
            If environment variables show &quot;Not set&quot;, add them to your
            .env.local file
          </li>
          <li>Test the sign&nbsp;in/out flow using the buttons above</li>
          <li>Check browser console for any client-side errors</li>
        </ul>
      </section>
    </div>
  );
}
