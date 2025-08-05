# Technical Debt & Feature Implementation Roadmap

This document outlines a phased approach to address outstanding technical debt and implement critical missing features. Each phase includes specific deliverables, a chain-of-thought prompting strategy for `claude-code`, and a mandatory live testing gate before proceeding to the next phase.

The AI's task is to execute the prompts for each deliverable, update this file to mark deliverables as complete, and fix all related technical debt.

---

## Phase 1: Foundational Systems (Email & Auth)

**Objective:** Establish reliable core user communication and a secure, complete authentication system.

### 1.1: Email System Implementation
- **Status:** `Pending`
- **Deliverables:**
  - [ ] Implement and configure an email service (e.g., Resend, SendGrid).
  - [ ] Create and test a password reset email flow.
  - [ ] Implement and test user invitation emails, triggered by the `sendInvites` flag in bulk user creation.
  - [ ] Establish a notification system for 3 critical events (e.g., plan change, new document, admin action).
- **Prompting Strategy:**
  1.  `"Claude, integrate the Resend SDK and configure it using environment variables. Create a utility function for sending emails."`
  2.  `"Now, create the API route and frontend components for a 'forgot password' flow that sends a reset link via email."`
  3.  `"Modify the bulk user import feature to correctly use the 'sendInvites' flag to dispatch invitation emails."`
  4.  `"Implement an event-driven notification system. Create a notification for when a company admin manually changes a user's benefit plan. Update this roadmap."`
- **Phase Gate:** Manually trigger a password reset, invite a new user, and confirm all three notification types are received via a real email client.

### 1.2: Authentication Completeness
- **Status:** `Pending`
- **Deliverables:**
  - [ ] Replace all temporary user/org ID generation with official Stack Auth API calls.
  - [ ] Implement a robust user creation flow that syncs with Stack Auth upon new user registration.
  - [ ] Implement a synchronization mechanism for `stackOrgId` when a new company is created.
  - [ ] Create a webhook or periodic job to sync user profile data (name, email) from Stack Auth to the local DB.
- **Prompting Strategy:**
  1.  `"Claude, analyze the codebase for all instances of temporary or manual ID creation for users and organizations. Replace them with the correct Stack Auth SDK methods."`
  2.  `"Refactor the user onboarding and company creation flows to ensure all user and organization data is first created in Stack Auth and the returned IDs are used in the local database."`
  3.  `"Create a webhook handler for Stack Auth to receive user profile updates and sync them to the local database. Update this roadmap."`
- **Phase Gate:** Register a new user, create a new company, and update a user's profile in the Stack Auth dashboard. Verify all changes are correctly reflected in the application's database without manual intervention.

---

## Phase 2: Core Feature Implementation (Documents & Benefits)

**Objective:** Build out the primary document processing pipeline and the core benefits-related AI tools.

### 2.1: Document Processing Pipeline
- **Status:** `Pending`
- **Deliverables:**
  - [ ] Implement text extraction from PDF and Word documents upon upload.
  - [ ] Generate embeddings for extracted text chunks using an embedding model.
  - [ ] Implement and test vector storage to Pinecone, including correct namespacing per company.
  - [ ] Activate the `/api/cron/process-documents` endpoint to process all documents currently in a "pending" state.
- **Prompting Strategy:**
  1.  `"Claude, integrate libraries for PDF and DOCX text extraction. Modify the document upload logic to extract text from uploaded files and store it."`
  2.  `"Implement a text chunking strategy. For each text chunk, generate embeddings using the OpenAI provider."`
  3.  `"Write the logic to upsert these embeddings into the Pinecone index, ensuring each vector is stored in a namespace corresponding to the document's companyId."`
  4.  `"Implement the '/api/cron/process-documents' endpoint. It should fetch all documents with a 'pending' status, run the full processing pipeline on them, and update their status to 'processed'. Update this roadmap."`
- **Phase Gate:** Upload a PDF and a Word document. Verify that the documents' statuses change from "pending" to "processed" and that the corresponding vectors can be queried from the correct Pinecone namespace.

### 2.2: Benefits-Specific Tools
- **Status:** `Pending`
- **Deliverables:**
  - [ ] Implement the backend logic for the `benefits_dashboard` tool to fetch real enrollment data.
  - [ ] Implement the `calculator` tool with actual cost calculation logic based on plan data.
  - [ ] Implement the `plan_comparison` tool to compare 2 or more plans on key metrics.
  - [ ] Ensure all three tools are registered and callable by the AI.
- **Prompting Strategy:**
  1.  `"Claude, implement the 'showBenefitsDashboard' tool. It should fetch the current user's enrollment data from the database and return a formatted summary."`
  2.  `"Implement the 'calculateBenefitsCost' tool. It needs to calculate estimated annual costs based on plan premiums, deductibles, and user-provided usage estimates."`
  3.  `"Implement the 'compareBenefitsPlans' tool. It should accept a list of plan IDs and return a structured comparison of their costs, coverage, and features."`
  4.  `"Register all three tools with the AI handler and write a test to verify each one can be successfully called. Update this roadmap."`
- **Phase Gate:** In the chat UI, successfully invoke the benefits dashboard, the cost calculator, and the plan comparison tool and receive accurate, data-driven responses.

---

## Phase 3: User & Admin Features

**Objective:** Build the necessary interfaces for user self-service and company administration.

### 3.1: User Profile & Onboarding
- **Status:** `Pending`
- **Deliverables:**
  - [ ] Implement the backend to save user selections from the onboarding flow.
  - [ ] Create a multi-step benefits enrollment flow (select plans, dependents).
  - [ ] Build a "Complete Your Profile" section for users to add missing data (department, hire date).
  - [ ] Ensure all user-provided data is correctly saved to the database.
- **Prompting Strategy:**
  1.  `"Claude, create the API endpoints and database logic to save the selections a user makes during the initial onboarding."`
  2.  `"Build the UI and backend for a multi-step benefits enrollment flow. It should allow users to view available plans and enroll in them."`
  3.  `"Add a 'Profile' page where users can input and update their department and hire date. Update this roadmap."`
- **Phase Gate:** Complete the onboarding flow as a new user. Enroll in a health and dental plan. Update your profile with a department. Verify all data is saved correctly in the database.

### 3.2: Company Admin Features
- **Status:** `Pending`
- **Deliverables:**
  - [ ] Implement the `/company-admin/benefits` page to allow admins to view and manage available benefit plans.
  - [ ] Implement the `/company-admin/employees` page to show a list of all employees and their enrollment statuses.
  - [ ] Add functionality for admins to add or remove a benefit plan for their company.
  - [ ] Add functionality for admins to view a specific employee's benefits selections.
- **Prompting Strategy:**
  1.  `"Claude, build the '/company-admin/benefits' page. It should display a table of all benefit plans associated with the admin's company."`
  2.  `"Build the '/company-admin/employees' page. It should display a list of all users in the company, with their name, email, and enrollment status."`
  3.  `"Add a feature to the benefits page that allows an admin to create, edit, and deactivate a benefit plan."`
  4.  `"On the employees page, make each employee clickable, leading to a detail view showing their current benefit enrollments. Update this roadmap."`
- **Phase Gate:** As a company admin, add a new dental plan. View the list of employees. Click on an employee to see their current (or lack of) enrollments.

---

## Phase 4: API & Production Readiness

**Objective:** Harden the API and implement features required for a production environment.

### 4.1: API Endpoint Implementation
- **Status:** `Pending`
- **Deliverables:**
  - [ ] Implement the `/api/chat/[id]/stream` endpoint for streaming chat responses.
  - [ ] Implement the `/api/suggestions` endpoint to provide contextual follow-up questions.
  - [ ] Implement the `/api/files/upload` endpoint with proper validation and security checks.
  - [ ] Fully implement the `/api/document` endpoint to handle CRUD operations for documents.
- **Prompting Strategy:**
  1.  `"Claude, refactor the chat response logic to use the Vercel AI SDK's streaming capabilities and implement the '/api/chat/[id]/stream' endpoint."`
  2.  `"Implement the '/api/suggestions' endpoint. It should take the last message as input and generate three relevant follow-up questions."`
  3.  `"Flesh out the '/api/files/upload' endpoint. Add server-side validation for file types and size, and integrate the call to the document processing pipeline."`
  4.  `"Complete the '/api/document' endpoint, ensuring it supports GET, POST, PUT, and DELETE operations with proper user authentication and authorization. Update this roadmap."`
- **Phase Gate:** Start a new chat and confirm the response streams in. Use the suggestions API. Upload a file. Create, read, update, and delete a document via API calls.

### 4.2: Production Features
- **Status:** `Pending`
- **Deliverables:**
  - [ ] Implement rate limiting on all critical API endpoints.
  - [ ] Create a system for generating and managing API keys for external access.
  - [ ] Implement a basic audit logging system that records critical events to a database table.
  - [ ] Implement a basic webhook system for notifying external services of key events (e.g., new user).
- **Prompting Strategy:**
  1.  `"Claude, add middleware to implement IP-based rate limiting for all public-facing API routes."`
  2.  `"Build a feature for super-admins to generate and revoke API keys for companies."`
  3.  `"Create a new database table for audit logs. Create a logging utility to record important actions, such as user login, plan changes, and document deletion."`
  4.  `"Implement a webhook delivery system. When a new user signs up, send a webhook to a configurable URL. Update this roadmap."`
- **Phase Gate:** Verify that API endpoints return a 429 error after too many requests. Generate an API key and use it to authenticate successfully. Check the audit log table after performing an action. Confirm a webhook is sent to a test endpoint.

---

## Phase 5: AI & Analytics

**Objective:** Improve the quality of AI responses and the accuracy of system analytics.

### 5.1: Search & RAG Quality
- **Status:** `Pending`
- **Deliverables:**
  - [ ] Implement a true semantic search function that queries Pinecone and returns relevant text chunks.
  - [ ] Integrate the retrieved context into the AI prompt to improve response accuracy (RAG).
  - [ ] Implement a feedback mechanism (thumbs up/down) on AI messages.
  - [ ] Store feedback and use it to identify low-quality responses.
  - [ ] Display the source document for information retrieved via RAG.
- **Prompting Strategy:**
  1.  `"Claude, create a function that takes a user's query, generates an embedding, and queries the Pinecone index to find the most relevant document chunks."`
  2.  `"Modify the main chat prompt to include the retrieved chunks as context for the AI to use when generating a response."`
  3.  `"Add thumbs up/down buttons to each AI message. When clicked, store the message ID, the user's feedback, and the conversation context in a new 'feedback' table."`
  4.  `"When the AI uses a document chunk for its response, include a citation in the message that links back to the source document. Update this roadmap."`
- **Phase Gate:** Ask a question that can only be answered by a document in the knowledge base and get a correct, cited answer. Give a response a "thumbs down" and verify the feedback is saved in the database.

### 5.2: Analytics Completeness
- **Status:** `Pending`
- **Deliverables:**
  - [ ] Replace all hardcoded cost tracking values with dynamic data from the model provider.
  - [ ] Track which model is used for each AI response.
  - [ ] Create a dashboard for super-admins to view cost breakdowns by model and by company.
  - [ ] Implement detailed error tracking with stack traces for all backend services.
- **Prompting Strategy:**
  1.  `"Claude, modify the AI response handler to capture the token usage and cost data returned by the OpenAI/Anthropic APIs, and store it with each message."`
  2.  `"Add a 'modelUsed' field to the messages table and populate it for every AI-generated response."`
  3.  `"Build a new analytics dashboard for super-admins that displays charts for token usage and costs, with filters for company and model."`
  4.  `"Integrate a more robust error logging service (e.g., Sentry) into the backend to capture and report all unhandled exceptions. Update this roadmap."`
- **Phase Gate:** Have a conversation using both OpenAI and Anthropic models. Check the super-admin dashboard to see the cost breakdown. Intentionally trigger a backend error and verify it's captured in the error logging service.
