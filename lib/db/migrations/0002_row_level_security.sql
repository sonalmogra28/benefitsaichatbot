-- Migration to implement Row-Level Security (RLS) for multi-tenant data isolation.

-- Enable RLS on all relevant tables.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "benefit_plans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "benefit_enrollments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "knowledge_base_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chats" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_analytics" ENABLE ROW LEVEL SECURITY;

-- Create policies to restrict access based on the user's company.
-- These policies assume that a session variable `rls.company_id` is set
-- for the current user's company.

-- Policy for the 'users' table
CREATE POLICY "users_company_isolation_policy"
ON "users"
FOR ALL
USING ("companyId" = current_setting('rls.company_id', true)::uuid);

-- Policy for the 'benefit_plans' table
CREATE POLICY "benefit_plans_company_isolation_policy"
ON "benefit_plans"
FOR ALL
USING ("companyId" = current_setting('rls.company_id', true)::uuid);

-- Policy for the 'benefit_enrollments' table
CREATE POLICY "benefit_enrollments_company_isolation_policy"
ON "benefit_enrollments"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "users"
    WHERE "users"."id" = "benefit_enrollments"."userId"
    AND "users"."companyId" = current_setting('rls.company_id', true)::uuid
  )
);

-- Policy for the 'knowledge_base_documents' table
CREATE POLICY "knowledge_base_documents_company_isolation_policy"
ON "knowledge_base_documents"
FOR ALL
USING ("companyId" = current_setting('rls.company_id', true)::uuid);

-- Policy for the 'chats' table
CREATE POLICY "chats_company_isolation_policy"
ON "chats"
FOR ALL
USING ("companyId" = current_setting('rls.company_id', true)::uuid);

-- Policy for the 'analytics_events' table
CREATE POLICY "analytics_events_company_isolation_policy"
ON "analytics_events"
FOR ALL
USING ("companyId" = current_setting('rls.company_id', true)::uuid);

-- Policy for the 'chat_analytics' table
CREATE POLICY "chat_analytics_company_isolation_policy"
ON "chat_analytics"
FOR ALL
USING ("companyId" = current_setting('rls.company_id', true)::uuid);

-- Note: The 'companies' table itself does not have RLS applied in this migration,
-- as it's often accessed system-wide to validate company information.
-- Access to this table should be restricted at the application layer.
