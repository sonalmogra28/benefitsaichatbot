-- PostgreSQL Row Level Security Implementation for Multi-Tenant Architecture
-- Run this with: psql -d your_database -f 002_row_level_security.sql

\echo 'Implementing Row Level Security for multi-tenant architecture...'

-- Note: This file contains PostgreSQL-specific syntax
-- RLS ensures data isolation at the database level

-- Enable RLS on companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Policy for companies: Users can only see their own company
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
  );

-- Policy for platform admins: Can access all companies
CREATE POLICY "companies_platform_admin_access" ON companies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE stack_user_id = current_setting('app.current_user_id', true)
      AND role = 'platform_admin'
    )
  );

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy for users: Can only see users from their company
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
  );

-- Policy for platform admins: Can access all users
CREATE POLICY "users_platform_admin_access" ON users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE stack_user_id = current_setting('app.current_user_id', true)
      AND role = 'platform_admin'
    )
  );

-- Enable RLS on chats table
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Policy for chats: Users can only see chats from their company
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
  );

-- Policy for platform admins: Can access all chats
CREATE POLICY "chats_platform_admin_access" ON chats
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE stack_user_id = current_setting('app.current_user_id', true)
      AND role = 'platform_admin'
    )
  );

-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy for messages: Users can only see messages from their company's chats
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
  );

-- Policy for platform admins: Can access all messages
CREATE POLICY "messages_platform_admin_access" ON messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE stack_user_id = current_setting('app.current_user_id', true)
      AND role = 'platform_admin'
    )
  );

-- Enable RLS on knowledge_base_documents table
ALTER TABLE knowledge_base_documents ENABLE ROW LEVEL SECURITY;

-- Policy for documents: Users can only see documents from their company
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
  );

-- Policy for platform admins: Can access all documents
CREATE POLICY "documents_platform_admin_access" ON knowledge_base_documents
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE stack_user_id = current_setting('app.current_user_id', true)
      AND role = 'platform_admin'
    )
  );

-- Enable RLS on benefit_plans table
ALTER TABLE benefit_plans ENABLE ROW LEVEL SECURITY;

-- Policy for benefit plans: Users can only see plans from their company
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
  );

-- Policy for platform admins: Can access all benefit plans
CREATE POLICY "benefit_plans_platform_admin_access" ON benefit_plans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE stack_user_id = current_setting('app.current_user_id', true)
      AND role = 'platform_admin'
    )
  );

-- Enable RLS on benefit_enrollments table
ALTER TABLE benefit_enrollments ENABLE ROW LEVEL SECURITY;

-- Policy for benefit enrollments: Users can only see enrollments from their company
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
  );

-- Policy for platform admins: Can access all benefit enrollments
CREATE POLICY "benefit_enrollments_platform_admin_access" ON benefit_enrollments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE stack_user_id = current_setting('app.current_user_id', true)
      AND role = 'platform_admin'
    )
  );

-- Enable RLS on analytics_events table
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Policy for analytics events: Users can only see events from their company
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
  );

-- Policy for platform admins: Can access all analytics events
CREATE POLICY "analytics_events_platform_admin_access" ON analytics_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE stack_user_id = current_setting('app.current_user_id', true)
      AND role = 'platform_admin'
    )
  );

-- Create a function to set tenant context
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
$$;

-- Grant execute permission to the web user
GRANT EXECUTE ON FUNCTION set_tenant_context(text, uuid) TO postgres;

-- Create a helper function to get current tenant context
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
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_current_tenant_context() TO postgres;
