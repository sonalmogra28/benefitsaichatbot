import { StackServerApp } from "@stackframe/stack";

export const stackServerApp = new StackServerApp({
  tokenStore: "nextjs-cookie",
  urls: {
    signIn: "/login",
    signUp: "/register",
    afterSignIn: "/",
    afterSignUp: "/onboarding",
    afterSignOut: "/",
  },
});
