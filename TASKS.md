# Task List: Benefits Assistant v4.0 Refactor

This document tracks the approved development tasks. I will not proceed with a task until the previous one is marked complete and verified. I will update this file to reflect the current status.

## Phase 1: Foundational Cleanup & Restructuring

- [x] **Task 1.1:** Purge all remaining multi-tenant code, including the `app/super-admin/companies` directory and any related dead code.
- [x] **Task 1.2:** Update `super-admin.service.ts` to remove any lingering multi-tenant logic and align with the single-tenant data model.
- [x] **Task 1.3:** Update `benefit.service.ts` to use the top-level `benefitPlans` collection.
- [x] **Task 1.4:** Re-create `company.service.ts` as a simplified, single-tenant service for managing platform-wide settings.

## Phase 2: Super Admin UI/UX for AI Configuration

- [x] **Task 2.1:** Create the new AI Configuration page at `app/super-admin/ai-config/page.tsx`.
- [x] **Task 2.2:** Build the UI for managing AI `personality` and `tone`.
- [x] **Task 2.3:** Create the API route `app/api/super-admin/ai-config` to save the settings to Firestore.

## Phase 3: Document Management & Weighting

- [x] **Task 3.1:** Create the new Document Management page at `app/super-admin/documents/page.tsx`.
- [ ] **Task 3.2:** Implement the file upload functionality to Firebase Storage.
- [ ] **Task 3.3:** Implement the UI for setting document `weight` (priority).
- [ ] **Task 3.4:** Create the Firebase Cloud Function for document ingestion and text extraction.

## Phase 4: Core Chat Logic with Vertex AI

- [ ] **Task 4.1:** Create the new `/api/chat` API route.
- [ ] **Task 4.2:** Implement the prompt construction logic, including AI settings and weighted document context.
- [ ] **Task 4.3:** Integrate the Vertex AI Gemini client to generate and stream responses.

## Phase 5: Frontend Integration & Finalization

- [ ] **Task 5.1:** Refactor the main chat interface to use the new `/api/chat` route.
- [ ] **Task 5.2:** Verify that all existing UI components (calculations, visuals) are working with the new data structure.
- [ ] **Task 5.3:** Final testing and validation.
