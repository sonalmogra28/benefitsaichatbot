# Authentication System: Task List

This file tracks the step-by-step implementation of the new authentication system, as defined in `AUTH_TECHNICAL_SPEC.md`.

## Phase 1: Environment & Configuration (Verification)

- [x] **Task 1.1:** Verify `.idx/dev.nix` is correct and contains `openjdk`.
- [x] **Task 1.2:** Verify `lib/config/env.local.ts` and `next.config.mjs` are correctly configured for emulator auto-detection.

## Phase 2: Core Firebase Setup

- [x] **Task 2.1:** **REWRITE** `lib/firebase/client.ts` to be the single source of truth for the client-side SDK.
- [x] **Task 2.2:** **REWRITE** `lib/firebase/admin.ts` to be the single source of truth for the server-side SDK.

## Phase 3: UI and Client-Side Logic

- [x] **Task 3.1:** **REWRITE** `components/auth-form.tsx` to be a simple, "dumb" UI component.
- [x] **Task 3.2:** **REWRITE** `app/(auth)/register/page.tsx` to use the new AuthForm and contain the `handleRegister` logic.
- [x] **Task 3.3:** **REWRITE** `app/(auth)/login/page.tsx` to use the new AuthForm and contain the `handleLogin` logic.

## Phase 4: State Management & Session Handling

- [x] **Task 4.1:** **REWRITE** `context/auth-context.tsx` to manage the user state and automatically handle session creation/deletion via the API.
- [x] **Task 4.2:** **REWRITE** `app/api/auth/session/route.ts` to securely create and delete the session cookie.

## Phase 5: Security and Finalization

- [x] **Task 5.1:** **REWRITE** `middleware.ts` to protect all necessary routes by verifying the session cookie.
- [ ] **Task 5.2:** **COMMIT** all changes to a new branch named `fix/authentication-overhaul`.
- [ ] **Task 5.3:** **RUN BUILD & TEST** locally to prove the system is stable.
- [ ] **Task 5.4:** Await your final approval to merge.
