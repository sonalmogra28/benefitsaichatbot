# Implementation Plan and Remaining Tasks

This document outlines the implementation plan for the new architecture and lists the remaining tasks to be completed.

## Implementation Plan

### 1. **Authentication and Authorization**
-   [x] **Firebase Configuration:** Separate Firebase client and admin configurations.
-   [x] **Client-Side Authentication:** Implement `react-firebase-hooks` for handling user authentication state.
-   [x] **Middleware:** Create a new middleware to protect routes based on user roles (`super-admin`, `company-admin`).
-   [ ] **API Route Protection:** Secure all API routes using the new middleware.
-   [ ] **UI Logic:** Update the UI to reflect the user's authentication state and role.

### 2. **Super Admin**
-   [ ] **Company Management:**
    -   [ ] Create, read, update, and delete company data in Firestore.
    -   [ ] UI for managing companies.
-   [ ] **User Management:**
    -   [ ] Assign roles to users (`super-admin`, `company-admin`, `employee`).
    -   [ ] UI for managing user roles.
-   [ ] **Branding:**
    -   [ ] Upload company logos to Firebase Storage.
    -   [ ] Define and apply theme colors.

### 3. **Company Admin**
-   [ ] **Employee Management:**
    -   [ ] Add, remove, and manage employees within their company.
    -   [ ] UI for employee management.
-   [ ] **Document Management:**
    -   [ ] Upload and manage company-specific documents.
    -   [ ] UI for document management.

### 4. **RAG and Document Processing**
-   [ ] **File Upload:**
    -   [ ] Implement a secure file upload system to Firebase Storage.
-   [ ] **Document Processing:**
    -   [ ] Create a Cloud Function to process uploaded documents.
    -   [ ] Extract text from documents.
    -   [ ] Generate embeddings with Vertex AI.
    -   [ ] Store embeddings in a vector database.

### 5. **Frontend**
-   [ ] **UI Cleanup:**
    -   [ ] Remove all unused components and pages.
    -   [ ] Refactor the UI to align with the new architecture.
-   [ ] **In-App Guides:**
    -   [ ] Create role-specific guides.

## Remaining Tasks

-   [ ] **API Routes:**
    -   [ ] Create API routes for all CRUD operations (companies, users, documents).
    -   [ ] Secure all API routes with the new middleware.
-   [ ] **UI Implementation:**
    -   [ ] Implement all remaining UI components for super admin and company admin.
-   [ ] **Testing:**
    -   [ ] Write unit and integration tests for all new components and API routes.
    -   [ ] Conduct end-to-end testing of the entire application.
-   [ ] **Deployment:**
    -   [ ] Configure CI/CD for automated deployments to Firebase.
-   [ ] **Analytics:**
    -   [ ] Implement analytics to track user engagement and system performance.
