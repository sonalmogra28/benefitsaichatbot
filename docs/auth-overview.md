# Authentication Overview

## Server (Next.js API) Endpoints

- All API routes (except `/api/auth/*`) require a Firebase ID token in the
  `Authorization: Bearer <token>` header.
- The global `middleware.ts` verifies the token via `/api/auth/verify-token`.
- Verified user information is forwarded to handlers through `x-user-id`,
  `x-company-id`, and `x-user-role` headers.
- Basic role-based restrictions are enforced:
  - `/api/super-admin/*` → `super-admin` role required
  - `/api/admin/*` and `/api/company-admin/*` → `company-admin` or higher
- Route handlers may apply stricter checks using `withAuth` or the
  `require*` helpers.

## Firebase Functions

- `processDocumentOnUpload` runs on Cloud Storage finalize events and processes
  uploaded documents. It does not accept direct user requests and relies on
  Firebase security rules for access control.

## Expected Auth Flow

1. Client obtains a Firebase ID token after user sign-in.
2. Client includes `Authorization: Bearer <token>` when calling API routes.
3. Middleware verifies the token and enforces role requirements.
4. Pages use a session cookie (`__session`) verified via `/api/auth/verify-session`.

## Required Headers

- `Authorization: Bearer <Firebase ID token>` for protected API calls.
- Middleware adds:
  - `x-user-id` – authenticated user's UID
  - `x-company-id` – user's company scope (if any)
  - `x-user-role` – normalized role string
