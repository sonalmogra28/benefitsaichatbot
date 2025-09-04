# Deployment Guide

This guide provides the steps to deploy the Benefits AI Platform to a live production environment. The application consists of two main parts: the Next.js frontend (served via Firebase Hosting) and the backend services (hosted on Google Cloud Functions via Firebase).

## Prerequisites

1.  **Firebase/Google Cloud Account & CLI:**
    *   Ensure you have a Firebase project created on the **Blaze (Pay-as-you-go)** plan, which is required for deploying functions.
    *   Install the Firebase CLI globally: `npm install -g firebase-tools`.
    *   Log in to your account: `firebase login`.

2.  **Environment Variables:**
    *   In the Firebase Console, navigate to **Build > Functions > Variables** and add all variables from your local `.env.local` file.
    *   Client-side variables (prefixed with `NEXT_PUBLIC_`) should remain in `.env.local` and will be embedded during the build process.

3.  **Enable Required Google Cloud APIs:**
    *   Ensure your Google Cloud project has the required APIs enabled (Cloud Build, Cloud Functions, Artifact Registry, Document AI, Vertex AI).

## Deployment Steps

### Step 1: Deploy Backend Cloud Functions

The backend logic, such as document processing, is handled by Google Cloud Functions.

1.  **Open your terminal** in the root directory of the project.
2.  **Run the deployment command:**

    ```bash
    firebase deploy --only functions
    ```

    This command reads the `firebase.json` and `functions/package.json` files, packages your backend functions, and deploys them to your Firebase project.

### Step 2: Deploy Frontend Application

The Next.js frontend is served through Firebase Hosting.

1.  **Build the frontend:**

    ```bash
    pnpm build
    ```

2.  **Deploy to Firebase Hosting:**

    ```bash
    firebase deploy --only hosting
    ```

    This uploads the compiled frontend assets and applies the hosting configuration defined in `firebase.json`.

---

Once both steps are complete, your application will be live at the URL provided by Firebase Hosting. You can now proceed to the `TESTING_GUIDE.md`.
