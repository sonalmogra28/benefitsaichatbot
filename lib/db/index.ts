import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// This configuration is now designed to work with Google Cloud SQL.
// For production on Cloud Run, it will connect via a Unix socket.
// For local development, it expects to connect to the Cloud SQL Auth Proxy.

const {
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_HOST, // For local proxy: 127.0.0.1
  DB_PORT, // For local proxy: 5432
  GCP_PROJECT,
  CLOUD_SQL_INSTANCE,
} = process.env;

let connectionString: string | undefined;

// Production environment on Google Cloud Run
if (process.env.NODE_ENV === 'production' && GCP_PROJECT && CLOUD_SQL_INSTANCE) {
  const socketPath = `/cloudsql/${GCP_PROJECT}:${CLOUD_SQL_INSTANCE}`;
  connectionString = `postgres://${DB_USER}:${DB_PASSWORD}@${socketPath}/${DB_NAME}`;
}
// Local development environment (connecting to Cloud SQL Auth Proxy)
else if (process.env.NODE_ENV === 'development') {
  if (!DB_HOST || !DB_PORT || !DB_USER || !DB_PASSWORD || !DB_NAME) {
    throw new Error('Missing database connection details for local development.');
  }
  connectionString = `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}
// Fallback for other environments or legacy variable
else {
  connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
}

if (!connectionString) {
  throw new Error('Database connection string could not be constructed. Check environment variables.');
}

const client = postgres(connectionString, {
  // Add SSL configuration for Cloud SQL if needed, though the proxy handles it.
  ssl: process.env.NODE_ENV === 'production' ? 'require' : 'prefer',
});

export const db = drizzle(client, { schema });
export * from './schema';
