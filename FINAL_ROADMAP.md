# Final Roadmap to Production Launch

This document outlines the definitive plan to deliver a production-ready, multi-tenant AI benefits platform fully integrated with Firebase and Google Cloud. This supersedes all previous roadmaps.

---

## **Phase 1: Architecture Cleanup & Firebase Consolidation (Completed)**

*Goal: Create a clean, single-stack foundation by removing all non-Firebase/Google Cloud services and dependencies.*

-   [x] **Database Migration:**
    -   [x] Remove Drizzle ORM and Neon-related packages (`drizzle-kit`, `drizzle-orm`, `pg`, `postgres`).
    -   [x] Refactor all database queries in `lib/db/queries.ts` and API routes to use the Firebase Admin SDK (for backend) and the Firebase Client SDK (for frontend) to interact with Firestore.
    -   [x] Rewrite the database schema from `lib/db/schema.ts` into Firestore data models.
-   [x] **Hosting & Deployment Consolidation:**
    -   [x] Remove Vercel-specific packages (`@vercel/analytics`, `@vercel/blob`, `@vercel/functions`, `@vercel/otel`, `@vercel/postgres`).
    -   [x] Remove `vercel.json` and any Vercel-specific deployment configurations.
    -   [x] Update `firebase.json` to correctly serve the Next.js application using Firebase Hosting.
-   [x] **Dependency & Code Cleanup:**
    -   [x] Conduct a full `npm` dependency review and remove all unused or redundant packages.
    -   [x] Delete all code related to the previous architecture (e.g., `lib/db/tenant-utils.ts`, any Vercel-specific API endpoints).
    -   [x] Refactor the `middleware.ts` to use Firebase Authentication for all route protection and role-based access control.

---

## **Phase 2: Implementing Core Features on Firebase (Completed)**

*Goal: Build out the application's core features using the new, consolidated Firebase architecture.*

-   [x] **Super Admin Portal:**
    -   [x] Implement UI for creating, viewing, and managing companies in Firestore.
    -   [x] Build a user management interface to assign roles (super admin, company admin, employee) via Firebase custom claims.
-   [x] **Company Branding:**
    -   [x] Implement a file upload mechanism (using Firebase Cloud Storage) for super admins to upload company logos.
    -   [x] Create a system for super admins to define a primary color for each company, to be stored in Firestore.
    -   [x] Implement the logic to dynamically apply company branding (logo and theme color) across the application.
-   [x] **RAG & Document Management:**
    -   [x] Implement a secure file upload system for super admins using Firebase Cloud Storage and signed URLs.
    -   [x] Implement an in-app document processing pipeline using a Next.js API route that uses Document AI and Vertex AI to process documents and store the embeddings in Firestore.
    -   [x] Build a UI for managing uploaded documents (view status, delete, re-process).
-   [ ] **HRIS Integration (Google Workspace):**
    -   [ ] Implement Google SSO for company admins.
    -   [ ] Develop a service to sync employee data from Google Workspace to Firestore.

---

## **Phase 3: UI/UX Polish & Beautification (Current Phase)**

*Goal: Create a polished, intuitive, and visually appealing user experience.*

-   [ ] **UI/UX Review:**
    -   [ ] Conduct a full review of the UI to ensure consistency and ease of use.
    -   [ ] Refine all admin and user interfaces for clarity and a professional look and feel.
    -   [ ] Ensure the application is fully responsive and accessible.
-   [ ] **In-App User Guides:**
    -   [ ] Create comprehensive in-app guides for each user role.
    -   [ ] Ensure the guides are easily accessible and searchable within the application.

---

## **Phase 4: Analytics, Testing & Production Deployment**

*Goal: Implement comprehensive analytics, ensure the application is robust and bug-free, and deploy to a live production environment on Firebase.*

-   [ ] **Comprehensive Analytics:**
    -   [ ] Design and implement a comprehensive analytics dashboard for the super admin portal using data from Firestore and Google Analytics.
    -   [ ] Track key metrics: user engagement, document usage, popular queries, etc.
-   [ ] **Testing:**
    -   [ ] Conduct thorough end-to-end testing of all user journeys and features.
    -   [ ] Perform a security audit of all Firebase rules (Firestore and Storage) and API endpoints.
    -   [ ] Write unit and integration tests for all critical components.
-   [ ] **Deployment:**
    -   [ ] Deploy the Next.js frontend to Firebase Hosting.
    -   [ ] Deploy all backend services as Firebase Cloud Functions.
    -   [ ] Configure a CI/CD pipeline for automated builds and deployments.

---

## **Phase 5: Post-Launch & Maintenance**

*Goal: Monitor the application, gather user feedback, and plan for future iterations.*

-   [ ] **Monitoring & Feedback:**
    -   [ ] Set up monitoring and alerting for all production services.
    -   [ ] Establish a system for gathering and responding to user feedback.
-   [ ] **Future Iterations:**
    -   [ ] Plan for future feature development based on user feedback and business goals.
    -   [ ] Continue to address any identified technical debt.
