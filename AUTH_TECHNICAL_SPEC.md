# Authentication Technical Specification

**Version:** 1.0
**Status:** Proposed

## 1. Overview

This document provides a detailed technical blueprint for implementing a secure, reliable, and simple single-tenant authentication system. It will serve as the source of truth for all authentication-related development.

## 2. Core Principles

- **Single Source of Truth:** Firebase Authentication is the only authority on user identity.
- **Client for Interaction, Server for State:** The client-side code is responsible for capturing user input (login/register) and communicating with Firebase. The server-side is responsible for all state-changing operations, primarily creating and verifying the session.
- **Emulator First:** The system must work flawlessly and automatically with the Firebase Emulators without requiring any secret keys for local development.

## 3. File-by-File Architecture

This section details the exact role and responsibility of every file involved in the authentication flow.

- **`.idx/dev.nix`**: **(COMPLETE)** Defines the development environment. It ensures `java` (via `openjdk`) is installed and available in the system `PATH` for the Firebase Emulators to run.

- **`lib/config/env.local.ts` & `next.config.mjs`**: **(COMPLETE)** These files work together to make the application "emulator-aware." The `next.config.mjs` reads the hardcoded emulator ports from `env.local.ts` and automatically sets the correct `FIREBASE_*_EMULATOR_HOST` environment variables at build time. This is the mechanism that allows the server to run without a `.env.local` file.

- **`lib/firebase/client.ts`**: The **only** file responsible for initializing the client-side Firebase SDK. It reads the public `NEXT_PUBLIC_*` variables from the environment and exports a single, shared `auth` object for use across all frontend components.

- **`lib/firebase/admin.ts`**: The **only** file responsible for initializing the server-side Firebase Admin SDK. It intelligently checks for emulator variables and connects automatically. It exports a single `adminAuth` object.

- **`components/auth-form.tsx`**: A "dumb" UI component. Its only job is to render the email/password form fields and buttons. It will not contain any logic. It will accept functions (`onSubmit`, `onGoogleClick`, etc.) as props from its parent page.

- **`app/(auth)/register/page.tsx`**: A client component (`'use client'`) that will:
  1.  Use the `<AuthForm />` component for its UI.
  2.  Contain the `handleRegister` function, which calls the client-side `createUserWithEmailAndPassword` from Firebase.
  3.  On success, it will get the `idToken` from the user object and immediately call our backend session API.

- **`app/(auth)/login/page.tsx`**: A client component that will:
  1.  Use the `<AuthForm />` component for its UI.
  2.  Contain the `handleLogin` and `handleGoogleLogin` functions, which call the client-side Firebase `signInWith...` methods.
  3.  On success, it will get the `idToken` and immediately call our backend session API.

- **`context/auth-context.tsx`**: This will be the central nervous system for client-side authentication.
  1.  It will use Firebase's `onIdTokenChanged` listener to detect when a user logs in or out on the client.
  2.  When a user logs in (an `idToken` is present), it will automatically make a `POST` request to `/api/auth/session` to create the server-side session cookie.
  3.  When a user logs out, it will make a `DELETE` request to `/api/auth/session` to clear the cookie.
  4.  It will provide the `user` object and `loading` state to the entire application.

- **`app/api/auth/session/route.ts`**: The secure server endpoint.
  1.  **`POST` method:** Will accept an `idToken`, verify it using `adminAuth.verifyIdToken()`, create a session cookie with `adminAuth.createSessionCookie()`, and set it in the browser. It will **always** return a JSON response.
  2.  **`DELETE` method:** Will clear the session cookie.

- **`middleware.ts`**: The application's bouncer.
  1.  It will run on all protected routes.
  2.  It will look for the `session` cookie.
  3.  It will use `adminAuth.verifySessionCookie()` to check if it's valid.
  4.  If the cookie is missing or invalid, it will redirect the user to `/login`.

## 4. Data Flow on Registration

1.  User fills out `AuthForm` on the `/register` page.
2.  `handleRegister` calls `createUserWithEmailAndPassword`.
3.  Firebase creates the user. The `onIdTokenChanged` listener in `auth-context.tsx` fires.
4.  The context automatically calls `POST /api/auth/session` with the new user's `idToken`.
5.  The API route verifies the token, creates a session cookie, and sets it in the user's browser.
6.  The user is now logged in, and the `middleware` will allow them to access protected pages.

This is the plan. I will not proceed until you approve it.
