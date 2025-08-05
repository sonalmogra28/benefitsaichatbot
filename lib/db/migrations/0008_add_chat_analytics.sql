-- Add chat_analytics table for detailed analytics tracking
CREATE TABLE IF NOT EXISTS "chat_analytics" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
    "user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "chat_id" UUID REFERENCES "chats"("id") ON DELETE CASCADE,
    "message_id" UUID REFERENCES "messages"("id") ON DELETE CASCADE,
    "event_type" VARCHAR(50) NOT NULL,
    "tool_name" VARCHAR(100),
    "response_time" INTEGER,
    "tokens_used" INTEGER,
    "cost" DECIMAL(10, 4),
    "feedback" VARCHAR(20),
    "error_occurred" BOOLEAN DEFAULT FALSE,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "chat_analytics_company_id_idx" ON "chat_analytics"("company_id");
CREATE INDEX IF NOT EXISTS "chat_analytics_user_id_idx" ON "chat_analytics"("user_id");
CREATE INDEX IF NOT EXISTS "chat_analytics_chat_id_idx" ON "chat_analytics"("chat_id");
CREATE INDEX IF NOT EXISTS "chat_analytics_event_type_idx" ON "chat_analytics"("event_type");
CREATE INDEX IF NOT EXISTS "chat_analytics_created_at_idx" ON "chat_analytics"("created_at");

-- Add RLS policies for chat_analytics
ALTER TABLE "chat_analytics" ENABLE ROW LEVEL SECURITY;

-- Company admins can view their company's analytics
CREATE POLICY "company_admins_view_analytics" ON "chat_analytics"
    FOR SELECT
    TO authenticated
    USING (
        company_id IN (
            SELECT company_id FROM users 
            WHERE id = auth.uid() 
            AND role IN ('company_admin', 'hr_admin', 'platform_admin')
        )
    );

-- Platform admins can view all analytics
CREATE POLICY "platform_admins_view_all_analytics" ON "chat_analytics"
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'platform_admin'
        )
    );

-- Service role can insert analytics (for backend tracking)
CREATE POLICY "service_insert_analytics" ON "chat_analytics"
    FOR INSERT
    TO service
    WITH CHECK (true);