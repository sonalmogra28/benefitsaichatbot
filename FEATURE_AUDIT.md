# Feature Audit & Codebase Map

This document provides a comprehensive map of the application's features and the corresponding files in the codebase.

## Core Architecture

*   **Framework:** Next.js (App Router)
*   **Hosting:** Firebase App Hosting (Frontend) & Google Cloud Functions (Backend)
*   **Database:** PostgreSQL (managed by Neon)
*   **Authentication:** Firebase Authentication
*   **AI & Search:** Google Cloud Vertex AI (for both chat and RAG)
*   **Styling:** Tailwind CSS & shadcn/ui

---

## Feature Breakdown

### 1. Authentication & User Roles

*   **Description:** Handles user sign-up, login, and role-based access control (RBAC).
*   **Key Files:**
    *   `lib/firebase.ts`: Firebase app initialization.
    *   `app/(auth)/login/page.tsx`: Login page UI.
    *   `app/(auth)/register/page.tsx`: Registration page UI.
    *   `components/auth-form.tsx`: Reusable form component for login/registration.
    *   `middleware.ts`: Protects routes based on authentication status and user roles.
    *   `lib/db/schema.ts` -> `users` table: Defines user roles in the database.

### 2. AI Chat (RAG-Powered)

*   **Description:** The core conversational interface powered by Vertex AI for chat and semantic search over private documents.
*   **Key Files:**
    *   `app/(chat)/page.tsx`: The main chat interface component.
    *   `app/(chat)/api/chat/route.ts`: API endpoint that calls the backend AI service.
    *   `lib/ai/providers.ts`: Configures the Google Vertex AI provider.
    *   `lib/ai/prompts.ts`: Contains the system prompts that guide the AI's behavior.
    *   `lib/vectors/vertexai.ts`: Code for interacting with Vertex AI for vector search (the "RAG" part).
    *   `components/chat.tsx`, `components/message.tsx`: Core UI components for the chat experience.

### 3. Super Admin Dashboard

*   **Description:** Platform-wide management interface for super administrators.
*   **Key Files:**
    *   `app/super-admin/page.tsx`: Main dashboard entry point.
    *   `app/super-admin/companies/page.tsx`: UI for creating and managing companies.
    *   `components/super-admin/companies-table.tsx`, `components/super-admin/create-company-dialog.tsx`: Components for company management.
    *   `app/super-admin/documents/page.tsx`: UI for uploading and managing documents for all companies.
    *   `components/super-admin/document-upload.tsx`, `components/super-admin/document-list.tsx`: Components for document management.
    *   `app/api/super-admin/**`: All API routes related to super admin actions.

### 4. Company Admin Dashboard

*   **Description:** Company-specific management interface for company administrators.
*   **Key Files:**
    *   `app/company-admin/page.tsx`: Dashboard entry point for company admins.
    *   `app/company-admin/employees/page.tsx`: UI for viewing and managing company employees.
    *   `app/company-admin/benefits/page.tsx`: UI for managing company benefit plans.
    *   `app/company-admin/settings/integrations/page.tsx`: UI for managing the Google Workspace HRIS integration.
    *   `app/api/company-admin/**`: All API routes related to company admin actions.

### 5. Document Processing & RAG Pipeline

*   **Description:** The backend workflow that powers the AI's knowledge base.
*   **Key Files:**
    *   `app/api/super-admin/companies/[id]/documents/upload/route.ts`: Handles the initial secure file upload.
    *   `functions/src/process-document.ts`: **(Backend Cloud Function)** This is the core pipeline. It is triggered by a file upload, uses Document AI to extract text, generates embeddings with Vertex AI, and upserts the data into the vector database.

### 6. HRIS Integration (Google Workspace)

*   **Description:** Allows for syncing employee data from a company's Google Workspace.
*   **Key Files:**
    *   `app/api/auth/google/route.ts`: Handles the Google OAuth 2.0 flow.
    *   `lib/services/google-workspace.service.ts`: Contains the logic for fetching users from the Google Admin SDK and syncing them to the database.
    *   `app/company-admin/settings/integrations/page.tsx`: The UI for initiating the connection and sync.

### 7. In-App User Guides

*   **Description:** Role-specific documentation available directly within the UI.
*   **Key Files:**
    *   `app/guide/page.tsx`: The main page that conditionally renders the correct guide based on the user's role.
    *   `components/guides/super-admin-guide.tsx`: Content for the Super Admin guide.
    *   `components/guides/company-admin-guide.tsx`: Content for the Company Admin guide.
    *   `components/guides/employee-guide.tsx`: Content for the Employee guide.
