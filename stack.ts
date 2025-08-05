import { StackServerApp } from '@stackframe/stack';

// This is the main server-side instance of your Stack Auth app.
export const stackServerApp = new StackServerApp({
  // The tokenStore must be 'nextjs-cookie' for Next.js App Router integration.
  tokenStore: 'nextjs-cookie',

  // IMPORTANT: We are REMOVING the `urls` configuration block.
  // Stack Auth's default URLs work perfectly with the new API route handler
  // at `/api/auth/[...stack]`. Specifying custom URLs can cause conflicts.
  //
  // REMOVED BLOCK:
  // urls: {
  //   signIn: "/login",
  //   signUp: "/register",
  //   afterSignIn: "/",
  //   afterSignUp: "/onboarding",
  //   afterSignOut: "/",
  // },
});
