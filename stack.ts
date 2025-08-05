import { StackServerApp } from '@stackframe/stack';

// This is the main server-side instance of your Stack Auth app.
export const stackServerApp = new StackServerApp({
  // The tokenStore must be 'nextjs-cookie' for Next.js App Router integration.
  tokenStore: 'nextjs-cookie',
  
  // Configure custom URLs for authentication flow
  urls: {
    home: process.env.NEXT_PUBLIC_STACK_URL || 'http://localhost:3000',
    signIn: '/login',
    signUp: '/register',
    afterSignIn: '/',
    afterSignUp: '/onboarding',
    afterSignOut: '/',
  },
});
