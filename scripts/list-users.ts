#!/usr/bin/env tsx
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function listUsers() {
  try {
    // Check Neon Auth sync table
    const neonUsers = await db.execute(sql`
      SELECT id, email, name, created_at
      FROM neon_auth.users_sync
      ORDER BY created_at DESC
      LIMIT 10
    `);

    console.log('\n📋 Recent users from Stack Auth:\n');
    console.log('ID                                    | Email                    | Name');
    console.log('--------------------------------------|--------------------------|------------------');
    
    for (const user of neonUsers.rows) {
      console.log(`${user.id} | ${user.email?.padEnd(24) || 'N/A'} | ${user.name || 'N/A'}`);
    }

    // Also check local users table
    const localUsers = await db.execute(sql`
      SELECT u.stack_user_id, u.email, u.role, c.name as company_name
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      ORDER BY u.created_at DESC
      LIMIT 10
    `);

    console.log('\n\n📋 Users in local database:\n');
    console.log('Stack User ID                         | Email                    | Role          | Company');
    console.log('--------------------------------------|--------------------------|---------------|------------------');
    
    for (const user of localUsers.rows) {
      console.log(`${user.stack_user_id} | ${user.email?.padEnd(24) || 'N/A'} | ${user.role?.padEnd(13) || 'N/A'} | ${user.company_name || 'N/A'}`);
    }

  } catch (error) {
    console.error('Error listing users:', error);
  }
  
  process.exit(0);
}

listUsers();