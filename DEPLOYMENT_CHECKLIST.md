# Production Go-Live Checklist

**Project**: Benefits Assistant Chatbot on GCP
**Date**: `__/__/____`
**Lead Engineer**: ______________

This checklist should be followed step-by-step during the final production deployment. Do not proceed to the next step until the current one is fully verified.

---

## Phase 1: Pre-Deployment

| Status | Task | Verification | Notes |
| :---: | :--- | :--- | :--- |
| `[ ]` | **Code Freeze** | `main` branch is protected. No new code is merged without emergency approval. | |
| `[ ]` | **Final Test Suite** | Run all E2E, integration, and unit tests in a GCP-based staging environment. | Link to test results: |
| `[ ]` | **Security Scan** | Run automated vulnerability scans on the final container image in Artifact Registry. | Scan report summary: |
| `[ ]` | **GCP Quotas** | Verify that all necessary GCP quotas (e.g., Cloud Run instances, CPU) are sufficient for expected launch traffic. | |
| `[ ]` | **Secrets Populated** | Confirm all production secrets have been created in Google Secret Manager. | `gcloud secrets list` |

---

## Phase 2: Deployment

| Status | Task | Verification | Notes |
| :---: | :--- | :--- | :--- |
| `[ ]` | **Trigger Production Build** | Manually trigger the Cloud Build pipeline for the `main` branch. | Link to build logs: |
| `[ ]` | **Monitor Build & Deploy** | Watch the Cloud Build logs for successful completion of all steps. | |
| `[ ]` | **Verify DB Migration** | Check the Cloud SQL database to ensure all tables were created by the initial migration script. | Connect via proxy and run `\dt`. |
| `[ ]` | **Cloud Run Service Health** | The new revision in Cloud Run should be healthy and serving 100% of traffic. | Check Cloud Run console. |

---

## Phase 3: Post-Deployment Verification (Before DNS Change)

| Status | Task | Verification | Notes |
| :---: | :--- | :--- | :--- |
| `[ ]` | **Access via Direct URL** | Navigate to the default `.run.app` URL provided by Cloud Run. | The application should load. |
| `[ ]` | **Create Test Account** | Register a new account using a test email address. | User should be created in the DB. |
| `[ ]` | **Core Feature Test** | - Login & Logout <br> - Start a chat session <br> - Upload a test document | All actions should succeed. |
| `[ ]` | **Check Logs & Metrics** | Open Google Cloud Logging and Monitoring to ensure requests and metrics are appearing. | |

---

## Phase 4: Go-Live

| Status | Task | Verification | Notes |
| :---: | :--- | :--- | :--- |
| `[ ]` | **Update DNS Records** | Change the production A/AAAA records to point to the Google Cloud Load Balancer IP. | |
| `[ ]` | **Verify via Public Domain** | After DNS propagation, access the site via its public domain name. | Site should load correctly. |
| `[ ]` | **Monitor Live Traffic** | Watch the monitoring dashboards for at least 1 hour for any anomalies or error spikes. | |

---

## Phase 5: Post-Launch

| Status | Task | Verification | Notes |
| :---: | :--- | :--- | :--- |
| `[ ]` | **Decommission Old Services** | After 24-48 hours of stability, shut down and delete old Vercel, Neon, and Pinecone projects. | **This is irreversible.** |
| `[ ]` | **Deployment Post-Mortem** | Schedule a meeting to discuss what went well and what could be improved for the next deployment. | |
