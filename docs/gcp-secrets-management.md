# GCP Secrets Management Guide

This guide details the standard practice for managing secrets (like API keys, database passwords, etc.) for the Benefits Assistant Chatbot application deployed on Google Cloud Platform.

We leverage **Google Secret Manager** as the single source of truth for all secrets and integrate it directly with **Google Cloud Run**.

## Core Principle

Application code **should not** be aware of Secret Manager. Instead, secrets are securely mounted into the Cloud Run service as environment variables. This approach is more secure, follows the principle of least privilege, and aligns with 12-factor app methodology.

## How It Works

1.  **Store Secrets**: All secrets are stored in Google Secret Manager. Each secret has a name (e.g., `DATABASE_PASSWORD`) and can have multiple versions.
2.  **Grant Access**: The Cloud Run service's runtime service account is granted the "Secret Manager Secret Accessor" (`roles/secretmanager.secretAccessor`) IAM role. This allows the service to access the specified secrets.
3.  **Mount on Deploy**: During deployment via Cloud Build, the `cloudbuild.yaml` specifies which secrets to mount and what environment variable names to assign them to.
4.  **Application Access**: The application code accesses these secrets like any other environment variable (e.g., `process.env.DATABASE_PASSWORD`).

## Step-by-Step Setup

### 1. Storing a Secret

To store a secret (do this for all required secrets like `DB_USER`, `DB_PASSWORD`, `OPENAI_API_KEY`, etc.):

\`\`\`bash
# Example for storing the database password
export DB_PASSWORD="your-secure-password"
echo -n "$DB_PASSWORD" | gcloud secrets create DATABASE_PASSWORD --data-file=-
\`\`\`

### 2. Granting Permissions

This is typically handled by the `scripts/setup_gcp.sh` script, but to do it manually for the default Compute Engine service account that Cloud Run uses:

\`\`\`bash
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

# Grant the role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
\`\`\`

### 3. Configuring `cloudbuild.yaml`

The deployment step in `cloudbuild.yaml` needs to be updated to map the secrets to environment variables.

See the example snippet for the `Deploy to Cloud Run` step:
\`\`\`yaml
  - name: 'gcr.io/cloud-builders/gcloud'
    id: 'Deploy to Cloud Run'
    args:
      - 'run'
      - 'deploy'
      - 'benefits-chatbot-app'
      - '--image'
      - '${_GCP_REGION}-docker.pkg.dev/$PROJECT_ID/benefits-chatbot/app:latest'
      - '--region'
      - '${_GCP_REGION}'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      # -- Mount Secrets as Environment Variables --
      - '--update-secrets=DB_USER=DB_USER:latest'
      - '--update-secrets=DB_PASSWORD=DB_PASSWORD:latest'
      - '--update-secrets=DB_NAME=DB_NAME:latest'
      - '--update-secrets=VERTEX_AI_MODEL=VERTEX_AI_MODEL:latest'
      # Add all other required secrets here
\`\`\`

## Local Development

For local development, you should use a `.env` file that is **not** checked into source control. To get the value of a secret from Secret Manager to put in your `.env` file:

\`\`\`bash
gcloud secrets versions access latest --secret="DATABASE_PASSWORD"
\`\`\`

This ensures that secrets are never hard-coded and the production environment remains secure and isolated.
