# Platform Migration to Google Cloud Platform (GCP) - Final Deployment Plan

**Version**: 1.1
**Status**: Finalizing
**Target Completion**: 1 Week

## 1. Executive Summary

This document outlines the final steps for deploying the Benefits Assistant Chatbot platform to Google Cloud Platform (GCP). As there is **no existing user data to migrate**, this process is streamlined into a fresh production deployment. The focus is on final testing, infrastructure verification, and go-live.

## 2. Goals

- **Successful Deployment**: Deploy the application to Cloud Run without errors.
- **Infrastructure Verification**: Ensure all GCP services are configured correctly and are communicating.
- **Production Readiness**: Confirm the platform is stable, secure, and performant for new users.

## 3. Deployment Phases

### Phase 1: GCP Foundation Setup (Completed)

**Objective**: Prepare the GCP environment for the application.
**Status**: All tasks are complete. The GCP project, networking, IAM, and core services are provisioned and configured.

### Phase 2: Application Adaptation (Completed)

**Objective**: Modify the application code to work with GCP services.
**Status**: All tasks are complete. The application is fully integrated with Cloud SQL, Vertex AI, GCS, and Secret Manager.

### Phase 3: CI/CD and Deployment Pipeline (Completed)

**Objective**: Automate the build and deployment process.
**Status**: All tasks are complete. The `cloudbuild.yaml` is configured to test, build, containerize, run database migrations, and deploy the application to Cloud Run.

---

### **Phase 4: Final Verification and Go-Live (Current Phase)**

**Objective**: Launch the application on GCP and make it publicly available.

- **[ ] Task 4.1: Pre-Launch Testing**
  - **E2E Tests**: Execute the full end-to-end test suite against a staging environment on GCP that mirrors the production setup.
  - **Load Testing**: Use a tool like Google Cloud's load testing service or k6 to simulate user traffic against the Cloud Run service to identify performance bottlenecks.
  - **Security Scan**: Run a vulnerability scan against the container image in Artifact Registry and the live Cloud Run URL.

- **[ ] Task 4.2: Production Deployment**
  - Trigger the `cloudbuild.yaml` pipeline for the `main` branch.
  - Monitor the build and deployment steps in the Google Cloud Console.
  - Verify that the initial database schema is created by the migration script.

- **[ ] Task 4.3: Post-Deployment Verification (Go-Live Checklist)**
  - **[ ] Health Check**: Access the application's health check endpoint.
  - **[ ] Create Test Account**: Register a new user account on the live application.
  - **[ ] Core Functionality Test**:
    - Log in and log out.
    - Initiate a conversation with the chatbot.
    - Upload a document.
    - Verify the interaction appears in the user's history.
  - **[ ] Monitoring**: Check Google Cloud's operations suite to ensure logs and metrics are being captured correctly.

- **[ ] Task 4.4: DNS Configuration**
  - Once all verification steps pass, update the production DNS records to point to the Google Cloud Run service.

- **[ ] Task 4.5: Decommission Old Infrastructure**
  - After a stability period of 24-48 hours, decommission any old Vercel, Neon, or Pinecone resources to prevent unnecessary costs.

## 4. Simplified Rollback Plan

In case of critical issues during deployment, the rollback plan is simple:
1.  **Stop Cloud Run Service**: Prevent the application from serving traffic.
2.  **Investigate Logs**: Use Google Cloud's operations suite to diagnose the build or runtime failure.
3.  **Fix and Redeploy**: Push a fix and trigger a new build. There is no need to revert DNS or restore a database since there is no live user data.
