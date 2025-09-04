import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

async function runMigration() {
  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    'postgres://neondb_owner:npg_3PRwIzrhfCo9@ep-holy-unit-ad50jybn-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

  console.log(
    '🔗 Using connection string:',
    connectionString.replace(/:[^:@]*@/, ':***@'),
  );

  if (!connectionString) {
    throw new Error('Database connection string not found');
  }

  console.log('🚀 Connecting to database...');
  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    console.log('📋 Reading migration file...');
    const migrationSQL = readFileSync(
      join(process.cwd(), 'lib/db/migrations/0001_multi_tenant_tables.sql'),
      'utf-8',
    );

    console.log('⚡ Executing migration...');
    await client.unsafe(migrationSQL);

    console.log('✅ Migration completed successfully!');

    // Test that tables were created
    console.log('🔍 Verifying tables...');
    const result = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('companies', 'users', 'benefit_plans', 'benefit_enrollments')
      ORDER BY table_name;
    `;

    console.log(
      '📊 Created tables:',
      result.map((r) => r.table_name),
    );
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  runMigration().catch(console.error);
}

export { runMigration };
