# Authentication Implementation Plan (Current & Stable)

This document describes the current, stable, and verified implementation of the authentication system in this project. It serves as the single source of truth for how authentication, session management, and role-based access control (RBAC) are handled.

---

## 1. Core Technology: Firebase

-   **Provider:** Firebase is the sole authentication provider.
-   **SDKs Used:**
    -   `firebase`: The primary client-side SDK.
    -   `firebase-admin`: The server-side SDK for administrative tasks like claim management and token verification.
    -   `react-firebase-hooks`: Used for convenient, real-time user state management in React components.

---

## 2. System Architecture & Flow

### 2.1. Firebase Configuration

-   **Client-Side (`lib/firebase.ts`):**
    -   Initializes the Firebase client app using environment variables (`NEXT_PUBLIC_*`).
    -   Exports the client `auth`, `db`, and `storage` services.
    -   **Snippet:**
        ```typescript
        // lib/firebase.ts
        import { getApp, getApps, initializeApp } from 'firebase/app';
        import { getAuth } from 'firebase/auth';
        // ...
        const firebaseConfig = { ... };
        const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        const auth = getAuth(app);
        // ...
        export { app, auth, db, storage };
        ```

-   **Server-Side (`lib/firebase/admin.ts`):**
    -   Initializes the Firebase Admin app. This code is guaranteed to only run on the server.
    -   Exports the `adminAuth`, `adminDb`, and `adminStorage` services for server-side logic (e.g., in API routes).
    -   **Snippet:**
        ```typescript
        // lib/firebase/admin.ts
        import * as admin from 'firebase-admin';

        if (!admin.apps.length) {
          admin.initializeApp({ ... });
        }

        export const adminAuth = admin.auth();
        // ...
        ```

### 2.2. User Registration & Login

-   **Component:** `components/auth-form.tsx`
-   **Logic:**
    -   A single form component handles both email/password registration and login.
    -   It uses the `signInWithEmailAndPassword` and `createUserWithEmailAndPassword` functions from the client Firebase SDK.
    -   **MFA Handling:** If a login attempt returns an `auth/multi-factor-required` error, it passes the `resolver` object to the parent `LoginPage`, which then renders the `MfaVerification` component.
    -   **Snippet:**
        ```typescript
        // components/auth-form.tsx
        // ...
        } catch (err: any) {
          if (err.code === 'auth/multi-factor-required') {
            setMfaResolver(err.resolver);
          } else {
            setError(err.message);
          }
        }
        ```

### 2.3. Multi-Factor Authentication (MFA)

-   **Enrollment (`components/mfa-enrollment.tsx`):**
    -   Allows a logged-in user to enroll a phone number as a second factor from their `/profile` page.
    -   Uses `RecaptchaVerifier` and `PhoneAuthProvider` to send a verification code.
    -   Upon successful code verification, it enrolls the second factor using `auth.currentUser.multiFactor.enroll()`.
-   **Verification (`components/mfa-verification.tsx`):**
    -   This component is rendered during the login flow if MFA is required.
    -   It receives the `resolver` object from the failed login attempt.
    -   The user enters the code sent to their phone, and the component resolves the sign-in using `resolver.resolveSignIn()`.

### 2.4. Session and Role Management

-   **Middleware (`middleware.ts`):**
    -   This is the primary gatekeeper for all protected routes (both pages and APIs).
    -   It retrieves the `idToken` from the request cookies.
    -   It uses the **server-side `adminAuth.verifyIdToken()`** to validate the token on every request to a protected route.
    -   It checks for the `role` claim within the decoded token and redirects unauthorized users.
    -   **Snippet:**
        ```typescript
        // middleware.ts
        // ...
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const { role } = decodedToken;

        if (pathname.startsWith('/super-admin') && role !== 'super-admin') {
          return NextResponse.redirect(new URL('/unauthorized', req.url));
        }
        // ...
        ```
-   **Client-Side Session Hook (`hooks/use-session.ts`):**
    -   Provides user session data to client components.
    -   It makes a `fetch` request to the `/api/auth/session` endpoint.
    -   This avoids exposing sensitive token details on the client while still providing necessary session info like `uid`, `email`, and `role`.
-   **Session API Endpoint (`app/api/auth/session/route.ts`):**
    -   A simple API route that is protected by the middleware.
    -   It verifies the token (which the middleware has already done, but this is a good defense-in-depth practice) and returns the decoded token claims as JSON.

### 2.5. Role-Based Access Control (RBAC) in the UI

-   **Component:** `components/with-role.tsx`
-   **Logic:**
    -   A Higher-Order Component (HOC) that wraps UI elements.
    -   It uses the `useSession()` hook to get the current user's role.
    -   It renders its `children` only if the user's role is present in the `allowedRoles` prop.
    -   **Snippet:**
        ```typescript
        // components/app-sidebar.tsx
        import { WithRole } from './with-role';
        // ...
        <WithRole allowedRoles="super-admin">
          <Link href="/super-admin">Super Admin</Link>
        </WithRole>
        ```

---

## 3. Current Status

The authentication system is **stable and fully implemented** according to the architecture described above. All core components—login, registration, MFA, session management, and RBAC—are in place and functional. All remnants of the previous authentication system have been removed.
