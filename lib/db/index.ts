import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('Database connection string not found');
}

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
export * from './schema';