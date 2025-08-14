#!/bin/bash
#
# GCP Environment Setup Script
#
# This script automates the provisioning of the necessary Google Cloud infrastructure
# for the Benefits Assistant Chatbot platform.
#
# IMPORTANT: This script is idempotent. It can be run multiple times, and it will
# only create resources that don't already exist.

set -e # Exit immediately if a command exits with a non-zero status.
set -u # Treat unset variables as an error.
set -o pipefail # Return the exit status of the last command in the pipe that failed.

# --- Configuration ---

# GCP Project Configuration
GCP_PROJECT_ID="benefits-ai-chatbot-platform"
GCP_REGION="us-central1"
BILLING_ACCOUNT=$(gcloud beta billing accounts list --format='value(ACCOUNT_ID)' --limit=1)

# Service Configuration
CLOUD_SQL_INSTANCE_NAME="${GCP_PROJECT_ID}-pg"
CLOUD_SQL_DB_NAME="benefits_db"
REDIS_INSTANCE_NAME="${GCP_PROJECT_ID}-redis"
GCS_BUCKET_NAME="${GCP_PROJECT_ID}-documents"

# Service Account for Cloud Build
CLOUD_BUILD_SA="cloud-build-sa"

# --- Helper Functions ---

# Function to check if a gcloud command succeeded
check_gcloud() {
  if [ $? -ne 0 ]; then
    echo "Error: gcloud command failed. Exiting."
    exit 1
  fi
}

# --- Main Script ---

echo "--- Starting GCP Setup for project: ${GCP_PROJECT_ID} ---"

# 1. Project Setup
echo "1. Setting up GCP Project..."
if ! gcloud projects describe ${GCP_PROJECT_ID} &> /dev/null; then
  echo "  - Project '${GCP_PROJECT_ID}' does not exist. Creating it now..."
  gcloud projects create ${GCP_PROJECT_ID}
  check_gcloud
else
  echo "  - Project '${GCP_PROJECT_ID}' already exists. Skipping creation."
fi

# Set the current project
gcloud config set project ${GCP_PROJECT_ID}
check_gcloud

# Link billing account
echo "  - Linking billing account '${BILLING_ACCOUNT}'..."
gcloud beta billing projects link ${GCP_PROJECT_ID} --billing-account=${BILLING_ACCOUNT}
check_gcloud

# 2. Enable APIs
echo "2. Enabling necessary GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  redis.googleapis.com \
  storage-component.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com \
  cloudresourcemanager.googleapis.com \
  aiplatform.googleapis.com
check_gcloud

# 3. Networking
# (Using default VPC for simplicity in this script)

# 4. Provision Core Services

# Cloud SQL (PostgreSQL)
echo "4.1 Provisioning Cloud SQL for PostgreSQL instance..."
if ! gcloud sql instances describe ${CLOUD_SQL_INSTANCE_NAME} &> /dev/null; then
  echo "  - Creating instance '${CLOUD_SQL_INSTANCE_NAME}'..."
  gcloud sql instances create ${CLOUD_SQL_INSTANCE_NAME} \
    --database-version=POSTGRES_14 \
    --region=${GCP_REGION} \
    --cpu=2 \
    --memory=4GB \
    --root-password-file=<(openssl rand -base64 24) # Note: For production, manage this better
  check_gcloud
  # Create the database
  gcloud sql databases create ${CLOUD_SQL_DB_NAME} --instance=${CLOUD_SQL_INSTANCE_NAME}
  check_gcloud
else
  echo "  - Cloud SQL instance '${CLOUD_SQL_INSTANCE_NAME}' already exists."
fi


# Memorystore for Redis
echo "4.2 Provisioning Memorystore for Redis instance..."
if ! gcloud redis instances describe ${REDIS_INSTANCE_NAME} --region=${GCP_REGION} &> /dev/null; then
  echo "  - Creating Redis instance '${REDIS_INSTANCE_NAME}'..."
  gcloud redis instances create ${REDIS_INSTANCE_NAME} \
    --size=1 \
    --region=${GCP_REGION} \
    --tier=BASIC
  check_gcloud
else
    echo "  - Redis instance '${REDIS_INSTANCE_NAME}' already exists."
fi

# Google Cloud Storage (GCS)
echo "4.3 Provisioning Google Cloud Storage bucket..."
if ! gsutil ls -b gs://${GCS_BUCKET_NAME} &> /dev/null; then
  echo "  - Creating GCS bucket 'gs://${GCS_BUCKET_NAME}'..."
  gsutil mb -p ${GCP_PROJECT_ID} -l ${GCP_REGION} gs://${GCS_BUCKET_NAME}
  check_gcloud
else
    echo "  - GCS bucket 'gs://${GCS_BUCKET_NAME}' already exists."
fi


# 5. CI/CD Setup
echo "5. Setting up CI/CD resources..."

# Create Service Account for Cloud Build
echo "  - Creating Service Account '${CLOUD_BUILD_SA}'..."
if ! gcloud iam service-accounts describe ${CLOUD_BUILD_SA}@${GCP_PROJECT_ID}.iam.gserviceaccount.com &> /dev/null; then
  gcloud iam service-accounts create ${CLOUD_BUILD_SA} --display-name="Cloud Build Service Account"
  check_gcloud
fi

# Grant permissions to the Service Account
echo "  - Granting permissions to '${CLOUD_BUILD_SA}'..."
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:${CLOUD_BUILD_SA}@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"
check_gcloud
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:${CLOUD_BUILD_SA}@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
check_gcloud
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} \
  --member="serviceAccount:${CLOUD_BUILD_SA}@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
check_gcloud


echo "--- GCP Setup Script Finished ---"
echo "Project ID: ${GCP_PROJECT_ID}"
echo "Region: ${GCP_REGION}"
echo "Cloud SQL Instance: ${CLOUD_SQL_INSTANCE_NAME}"
echo "Redis Instance: ${REDIS_INSTANCE_NAME}"
echo "GCS Bucket: gs://${GCS_BUCKET_NAME}"

