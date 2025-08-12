import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

const runRlsMigration = async () => {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set.');
    }

    const db = drizzle(postgres(connectionString, { max: 1 }));

    // Read and execute the SQL file
    const sql = readFileSync(
      join(__dirname, '0002_row_level_security.sql'),
      'utf-8',
    );
    await db.execute(sql);

  } catch (error) {
    console.error('Error applying RLS migration:', error);
    process.exit(1);
  }
};

runRlsMigration();
