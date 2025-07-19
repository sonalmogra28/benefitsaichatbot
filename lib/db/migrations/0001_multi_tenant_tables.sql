-- Multi-tenant tables migration
-- This creates the new multi-tenant schema while preserving existing data

-- Create companies table
CREATE TABLE IF NOT EXISTS "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stack_org_id" text UNIQUE NOT NULL,
	"name" text NOT NULL,
	"domain" text UNIQUE,
	"settings" json DEFAULT '{}',
	"subscription_tier" varchar(50) DEFAULT 'basic',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create users table (multi-tenant version)
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stack_user_id" text UNIQUE NOT NULL,
	"company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"role" varchar(50) DEFAULT 'employee' NOT NULL,
	"employee_id" text,
	"department" text,
	"hire_date" date,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	UNIQUE("email", "company_id"),
	UNIQUE("employee_id", "company_id")
);

-- Create benefit_plans table
CREATE TABLE IF NOT EXISTS "benefit_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
	"name" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"category" varchar(50) NOT NULL,
	"provider" text NOT NULL,
	"description" text,
	"monthly_premium_employee" numeric(10,2),
	"monthly_premium_family" numeric(10,2),
	"deductible_individual" numeric(10,2),
	"deductible_family" numeric(10,2),
	"out_of_pocket_max_individual" numeric(10,2),
	"out_of_pocket_max_family" numeric(10,2),
	"copay_primary_care" numeric(10,2),
	"copay_specialist" numeric(10,2),
	"coinsurance_percentage" integer,
	"features" json DEFAULT '[]',
	"coverage_details" json DEFAULT '{}',
	"effective_date" date NOT NULL,
	"end_date" date,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	UNIQUE("name", "company_id", "effective_date")
);

-- Create benefit_enrollments table
CREATE TABLE IF NOT EXISTS "benefit_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"benefit_plan_id" uuid NOT NULL REFERENCES "benefit_plans"("id") ON DELETE CASCADE,
	"coverage_type" varchar(50) NOT NULL,
	"enrollment_date" date NOT NULL,
	"effective_date" date NOT NULL,
	"end_date" date,
	"monthly_cost" numeric(10,2) NOT NULL,
	"employer_contribution" numeric(10,2) DEFAULT '0',
	"employee_contribution" numeric(10,2) NOT NULL,
	"dependents" json DEFAULT '[]',
	"status" varchar(50) DEFAULT 'active',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	UNIQUE("user_id", "benefit_plan_id", "effective_date")
);

-- Create knowledge_base_documents table
CREATE TABLE IF NOT EXISTS "knowledge_base_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"category" varchar(50),
	"tags" text[],
	"file_url" text,
	"file_type" varchar(20),
	"processed_at" timestamp with time zone,
	"is_public" boolean DEFAULT false,
	"created_by" uuid REFERENCES "users"("id"),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create chats table (multi-tenant version)
CREATE TABLE IF NOT EXISTS "chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
	"title" text NOT NULL,
	"visibility" varchar(20) DEFAULT 'private',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create messages table (multi-tenant version)
CREATE TABLE IF NOT EXISTS "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL REFERENCES "chats"("id") ON DELETE CASCADE,
	"role" varchar(20) NOT NULL,
	"parts" json NOT NULL,
	"attachments" json DEFAULT '[]' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create votes table (multi-tenant version)
CREATE TABLE IF NOT EXISTS "votes" (
	"chat_id" uuid NOT NULL REFERENCES "chats"("id") ON DELETE CASCADE,
	"message_id" uuid NOT NULL REFERENCES "messages"("id") ON DELETE CASCADE,
	"is_upvoted" boolean NOT NULL,
	PRIMARY KEY("chat_id", "message_id")
);

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
	"user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"event_type" varchar(100) NOT NULL,
	"event_data" json DEFAULT '{}',
	"session_id" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "companies_stack_org_id_idx" ON "companies" ("stack_org_id");
CREATE INDEX IF NOT EXISTS "companies_domain_idx" ON "companies" ("domain");
CREATE INDEX IF NOT EXISTS "users_stack_user_id_idx" ON "users" ("stack_user_id");
CREATE INDEX IF NOT EXISTS "users_company_id_idx" ON "users" ("company_id");
CREATE INDEX IF NOT EXISTS "benefit_plans_company_id_idx" ON "benefit_plans" ("company_id");
CREATE INDEX IF NOT EXISTS "benefit_plans_type_idx" ON "benefit_plans" ("type");
CREATE INDEX IF NOT EXISTS "benefit_plans_effective_date_idx" ON "benefit_plans" ("effective_date");
CREATE INDEX IF NOT EXISTS "benefit_enrollments_user_id_idx" ON "benefit_enrollments" ("user_id");
CREATE INDEX IF NOT EXISTS "benefit_enrollments_benefit_plan_id_idx" ON "benefit_enrollments" ("benefit_plan_id");
CREATE INDEX IF NOT EXISTS "benefit_enrollments_effective_date_idx" ON "benefit_enrollments" ("effective_date");
CREATE INDEX IF NOT EXISTS "knowledge_base_documents_company_id_idx" ON "knowledge_base_documents" ("company_id");
CREATE INDEX IF NOT EXISTS "knowledge_base_documents_document_type_idx" ON "knowledge_base_documents" ("document_type");
CREATE INDEX IF NOT EXISTS "knowledge_base_documents_category_idx" ON "knowledge_base_documents" ("category");
CREATE INDEX IF NOT EXISTS "knowledge_base_documents_created_by_idx" ON "knowledge_base_documents" ("created_by");
CREATE INDEX IF NOT EXISTS "chats_user_id_idx" ON "chats" ("user_id");
CREATE INDEX IF NOT EXISTS "chats_company_id_idx" ON "chats" ("company_id");
CREATE INDEX IF NOT EXISTS "chats_created_at_idx" ON "chats" ("created_at");
CREATE INDEX IF NOT EXISTS "messages_chat_id_idx" ON "messages" ("chat_id");
CREATE INDEX IF NOT EXISTS "messages_created_at_idx" ON "messages" ("created_at");
CREATE INDEX IF NOT EXISTS "analytics_events_company_id_idx" ON "analytics_events" ("company_id");
CREATE INDEX IF NOT EXISTS "analytics_events_user_id_idx" ON "analytics_events" ("user_id");
CREATE INDEX IF NOT EXISTS "analytics_events_event_type_idx" ON "analytics_events" ("event_type");
CREATE INDEX IF NOT EXISTS "analytics_events_created_at_idx" ON "analytics_events" ("created_at");
