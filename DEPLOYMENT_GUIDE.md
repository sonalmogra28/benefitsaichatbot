# Deployment Guide

This guide provides the steps to deploy the Benefits AI Platform to a live production environment. The application consists of two main parts: the Next.js frontend (hosted on Vercel) and the backend services (hosted on Google Cloud Functions via Firebase).

## Prerequisites

1.  **Vercel Account & CLI:**
    *   Ensure you have a Vercel account.
    *   Install the Vercel CLI globally: `npm install -g vercel`.
    *   Log in to your account: `vercel login`.

2.  **Firebase/Google Cloud Account & CLI:**
    *   Ensure you have a Firebase project created on the **Blaze (Pay-as-you-go)** plan, which is required for deploying functions.
    *   Install the Firebase CLI globally: `npm install -g firebase-tools`.
    *   Log in to your account: `firebase login`.

3.  **Environment Variables:**
    *   **Vercel:** In your Vercel project dashboard, navigate to **Settings > Environment Variables** and add all the variables from your local `.env.local` file. Ensure they are set for the "Production" environment.
    *   **Google Cloud:** Your Cloud Functions will inherit the necessary credentials from the service account and environment settings. Ensure your Google Cloud project has the required APIs enabled (Cloud Build, Cloud Functions, Artifact Registry, Document AI, Vertex AI).

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

The Next.js frontend is deployed to Vercel for optimal performance and scalability.

#### Method 1: Git Integration (Recommended)

This is the best practice for continuous deployment.

1.  **Push your code** to a GitHub, GitLab, or Bitbucket repository.
2.  **Create a new project on Vercel:** Import the repository you just created.
3.  **Configure the project:** Vercel will automatically detect that it's a Next.js application.
    *   Ensure the "Root Directory" is the base of your project.
    *   Add your environment variables as described in the prerequisites.
4.  **Deploy:** Click the "Deploy" button. Vercel will build and deploy your application.

From now on, any push to your main branch will automatically trigger a new production deployment.

#### Method 2: Manual Deployment via Vercel CLI

Use this method to deploy a specific version from your local machine.

1.  **Open your terminal** in the root directory of the project.
2.  **Run the production deployment command:**

    ```bash
    vercel deploy --prod
    ```

3.  **Follow the prompts:** The CLI will guide you through linking the project to a Vercel project (if you haven't already) and completing the deployment.

---

Once both steps are complete, your application will be live at the URL provided by Vercel. You can now proceed to the `TESTING_GUIDE.md`.
