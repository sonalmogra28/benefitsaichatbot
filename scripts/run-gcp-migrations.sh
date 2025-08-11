#!/bin/bash
#
# Secure Database Migration Script for Google Cloud SQL
#
# This script is designed to be run within a CI/CD environment like Google Cloud Build.
# It securely connects to a Cloud SQL instance using the Cloud SQL Auth Proxy,
# runs database migrations, and then tears down the connection.

set -e
set -u
set -o pipefail

# --- Configuration ---
# These variables should be passed from the CI/CD environment.
# :? operator ensures the script fails if the variable is not set.
: "${DB_USER:?DB_USER not set}"
: "${DB_PASSWORD:?DB_PASSWORD not set}"
: "${DB_NAME:?DB_NAME not set}"
: "${CLOUD_SQL_INSTANCE_CONNECTION_NAME:?CLOUD_SQL_INSTANCE_CONNECTION_NAME not set}"

# The proxy will listen on this host and port
PROXY_HOST="127.0.0.1"
PROXY_PORT="5432"

# --- Main Script ---

echo "--- Starting Secure Database Migration ---"

# 1. Download and setup Cloud SQL Auth Proxy
echo "1. Downloading Cloud SQL Auth Proxy..."
wget https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.2/cloud-sql-proxy.linux.amd64 -O cloud-sql-proxy
chmod +x cloud-sql-proxy

# 2. Start the proxy in the background
echo "2. Starting Cloud SQL Auth Proxy in the background..."
./cloud-sql-proxy ${CLOUD_SQL_INSTANCE_CONNECTION_NAME} --credentials-file "$GOOGLE_APPLICATION_CREDENTIALS" &
PROXY_PID=$!

# Wait for the proxy to be ready
echo "   - Waiting for proxy to establish connection..."
sleep 5 # Increase if connection is slow

# 3. Run the migrations
echo "3. Running database migrations..."
# Set the database URL for Drizzle Kit to use
export DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@${PROXY_HOST}:${PROXY_PORT}/${DB_NAME}"

# Assuming 'pnpm' is available in the build environment
pnpm db:migrate

echo "   - Migrations completed successfully."

# 4. Stop the Cloud SQL Auth Proxy
echo "4. Shutting down Cloud SQL Auth Proxy..."
kill ${PROXY_PID}
wait ${PROXY_PID} || true # a|| true to prevent exit on non-zero status of a killed process

echo "--- Secure Database Migration Finished ---"
