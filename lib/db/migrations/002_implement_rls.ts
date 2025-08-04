import { sql } from 'drizzle-orm';
import { db } from '../index';

/**
 * Row Level Security Migration
 * Implements database-level tenant isolation for security
 */
export async function implementRowLevelSecurity() {
  console.log('🔒 Implementing Row Level Security...');

  try {
    // Enable RLS on companies table
    await db.execute(sql`ALTER TABLE companies ENABLE ROW LEVEL SECURITY`);
    
    // Companies policies
    await db.execute(sql`
      CREATE POLICY "companies_tenant_isolation" ON companies
        FOR ALL
        USING (
          id = COALESCE(
            current_setting('app.current_company_id', true)::uuid,
            (
              SELECT u.company_id 
              FROM users u 
              WHERE u.stack_user_id = current_setting('app.current_user_id', true)
            )
          )
        )
    `);

    await db.execute(sql`
      CREATE POLICY "companies_platform_admin_access" ON companies
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE stack_user_id = current_setting('app.current_user_id', true)
            AND role = 'platform_admin'
          )
        )
    `);

    // Enable RLS on users table
    await db.execute(sql`ALTER TABLE users ENABLE ROW LEVEL SECURITY`);
    
    // Users policies
    await db.execute(sql`
      CREATE POLICY "users_tenant_isolation" ON users
        FOR ALL
        USING (
          company_id = COALESCE(
            current_setting('app.current_company_id', true)::uuid,
            (
              SELECT u.company_id 
              FROM users u 
              WHERE u.stack_user_id = current_setting('app.current_user_id', true)
            )
          )
        )
    `);

    await db.execute(sql`
      CREATE POLICY "users_platform_admin_access" ON users
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE stack_user_id = current_setting('app.current_user_id', true)
            AND role = 'platform_admin'
          )
        )
    `);

    // Enable RLS on chats table
    await db.execute(sql`ALTER TABLE chats ENABLE ROW LEVEL SECURITY`);
    
    // Chats policies
    await db.execute(sql`
      CREATE POLICY "chats_tenant_isolation" ON chats
        FOR ALL
        USING (
          company_id = COALESCE(
            current_setting('app.current_company_id', true)::uuid,
            (
              SELECT u.company_id 
              FROM users u 
              WHERE u.stack_user_id = current_setting('app.current_user_id', true)
            )
          )
        )
    `);

    await db.execute(sql`
      CREATE POLICY "chats_platform_admin_access" ON chats
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE stack_user_id = current_setting('app.current_user_id', true)
            AND role = 'platform_admin'
          )
        )
    `);

    // Enable RLS on messages table
    await db.execute(sql`ALTER TABLE messages ENABLE ROW LEVEL SECURITY`);
    
    // Messages policies
    await db.execute(sql`
      CREATE POLICY "messages_tenant_isolation" ON messages
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM chats c
            WHERE c.id = messages.chat_id
            AND c.company_id = COALESCE(
              current_setting('app.current_company_id', true)::uuid,
              (
                SELECT u.company_id 
                FROM users u 
                WHERE u.stack_user_id = current_setting('app.current_user_id', true)
              )
            )
          )
        )
    `);

    await db.execute(sql`
      CREATE POLICY "messages_platform_admin_access" ON messages
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE stack_user_id = current_setting('app.current_user_id', true)
            AND role = 'platform_admin'
          )
        )
    `);

    // Enable RLS on knowledge_base_documents table
    await db.execute(sql`ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY`);
    
    // Documents policies
    await db.execute(sql`
      CREATE POLICY "documents_tenant_isolation" ON knowledge_base_documents
        FOR ALL
        USING (
          company_id = COALESCE(
            current_setting('app.current_company_id', true)::uuid,
            (
              SELECT u.company_id 
              FROM users u 
              WHERE u.stack_user_id = current_setting('app.current_user_id', true)
            )
          )
        )
    `);

    await db.execute(sql`
      CREATE POLICY "documents_platform_admin_access" ON knowledge_base_documents
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE stack_user_id = current_setting('app.current_user_id', true)
            AND role = 'platform_admin'
          )
        )
    `);

    // Enable RLS on benefit_plans table
    await db.execute(sql`ALTER TABLE benefit_plans ENABLE ROW LEVEL SECURITY`);
    
    // Benefit plans policies
    await db.execute(sql`
      CREATE POLICY "benefit_plans_tenant_isolation" ON benefit_plans
        FOR ALL
        USING (
          company_id = COALESCE(
            current_setting('app.current_company_id', true)::uuid,
            (
              SELECT u.company_id 
              FROM users u 
              WHERE u.stack_user_id = current_setting('app.current_user_id', true)
            )
          )
        )
    `);

    await db.execute(sql`
      CREATE POLICY "benefit_plans_platform_admin_access" ON benefit_plans
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE stack_user_id = current_setting('app.current_user_id', true)
            AND role = 'platform_admin'
          )
        )
    `);

    // Enable RLS on benefit_enrollments table
    await db.execute(sql`ALTER TABLE benefit_enrollments ENABLE ROW LEVEL SECURITY`);
    
    // Benefit enrollments policies
    await db.execute(sql`
      CREATE POLICY "benefit_enrollments_tenant_isolation" ON benefit_enrollments
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = benefit_enrollments.user_id
            AND u.company_id = COALESCE(
              current_setting('app.current_company_id', true)::uuid,
              (
                SELECT u2.company_id 
                FROM users u2 
                WHERE u2.stack_user_id = current_setting('app.current_user_id', true)
              )
            )
          )
        )
    `);

    await db.execute(sql`
      CREATE POLICY "benefit_enrollments_platform_admin_access" ON benefit_enrollments
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE stack_user_id = current_setting('app.current_user_id', true)
            AND role = 'platform_admin'
          )
        )
    `);

    // Enable RLS on analytics_events table
    await db.execute(sql`ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY`);
    
    // Analytics events policies
    await db.execute(sql`
      CREATE POLICY "analytics_events_tenant_isolation" ON analytics_events
        FOR ALL
        USING (
          company_id = COALESCE(
            current_setting('app.current_company_id', true)::uuid,
            (
              SELECT u.company_id 
              FROM users u 
              WHERE u.stack_user_id = current_setting('app.current_user_id', true)
            )
          )
        )
    `);

    await db.execute(sql`
      CREATE POLICY "analytics_events_platform_admin_access" ON analytics_events
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM users 
            WHERE stack_user_id = current_setting('app.current_user_id', true)
            AND role = 'platform_admin'
          )
        )
    `);

    // Create helper functions
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION set_tenant_context(user_id text, company_id uuid DEFAULT NULL)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        -- Set the current user ID
        PERFORM set_config('app.current_user_id', user_id, true);
        
        -- If company_id is provided, use it; otherwise derive from user
        IF company_id IS NOT NULL THEN
          PERFORM set_config('app.current_company_id', company_id::text, true);
        ELSE
          PERFORM set_config('app.current_company_id', 
            (SELECT u.company_id::text FROM users u WHERE u.stack_user_id = user_id), 
            true
          );
        END IF;
      END;
      $$
    `);

    await db.execute(sql`
      CREATE OR REPLACE FUNCTION get_current_tenant_context()
      RETURNS TABLE(user_id text, company_id uuid)
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        RETURN QUERY SELECT 
          current_setting('app.current_user_id', true),
          COALESCE(
            current_setting('app.current_company_id', true)::uuid,
            (
              SELECT u.company_id 
              FROM users u 
              WHERE u.stack_user_id = current_setting('app.current_user_id', true)
            )
          );
      END;
      $$
    `);

    console.log('✅ Row Level Security implemented successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to implement RLS:', error);
    throw error;
  }
}

// Run the migration if called directly
if (require.main === module) {
  implementRowLevelSecurity()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
