# Benefits AI Platform - Development Roadmap & Claude Code Prompt Sequence

## Executive Summary
This roadmap completes the Benefits AI Platform from its current Phase 2.1 state (Document Upload Infrastructure) to full production readiness. The project requires approximately 8-10 weeks of development, structured into 7 phases with paired frontend/backend tasks for immediate integration testing.

## Current State Assessment
- **Complete**: Multi-tenant schema, Stack Auth integration, AI chat, visual tools, document upload API
- **Broken**: Authentication runtime (Next.js 15 compatibility), no RLS enforcement
- **Missing**: RAG/search, admin portals, analytics, error handling, tests

---

# PHASE 1: Critical Foundation Fixes (Week 1)
*Fix authentication and implement security fundamentals*

## Phase 1, Task 1.1 (Backend): Fix Stack Auth Handler for Next.js 15
**Objective:** Resolve the authentication handler to properly process Stack Auth routes instead of returning dummy JSON responses.

**Context & Current State:**
* **Relevant Files:** 
  - `/app/handler/[...stack]/route.ts`
  - `/stack.ts`
  - `/app/(auth)/stack-auth.ts`
* **Existing Code Snippets:**
  ```typescript
  // Current broken handler
  export async function GET(request: NextRequest, props: { params: Promise<{ stack: string[] }> }) {
    return new Response(JSON.stringify({ message: 'Stack Auth handler - temporary implementation' }));
  }
  ```
* **Project Patterns:** Next.js 15 requires explicit Response objects, uses edge runtime, Stack Auth with cookie-based sessions

**Detailed Instructions:**
1. **Import Stack handler utilities:** At the top of `/app/handler/[...stack]/route.ts`, import the proper Stack Auth handler from the SDK.
2. **Create handler wrapper:** Build a wrapper function that ensures a Response object is always returned while processing Stack Auth routes.
3. **Handle async params:** Use `await props.params` to resolve the params promise as required by Next.js 15.
4. **Process auth routes:** Map the stack path array to Stack Auth's expected route handling (sign-in, sign-up, callback, etc.).
5. **Add error handling:** Wrap all logic in try-catch to ensure errors return proper Response objects.
6. **Set correct headers:** Ensure cookies are properly set with SameSite and Secure attributes.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** Users can sign in, sign up, and maintain sessions without redirect loops.
* **Error Handling:** All errors must return Response objects with appropriate status codes (401, 500, etc.).
* **Self-Validation:** After implementation, test sign-in flow and verify `await auth()` returns a valid session object.

---

## Phase 1, Task 1.2 (Frontend): Create Auth Debug Page
**Objective:** Build a debug page to validate authentication state and troubleshoot issues.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/app/debug/auth/page.tsx`
  - `/app/(auth)/stack-auth.ts`
* **Existing Code Snippets:**
  ```typescript
  export async function auth() {
    const stackUser = await stackServerApp.getUser();
    // ... user lookup logic
  }
  ```
* **Project Patterns:** Server components, async/await for data fetching

**Detailed Instructions:**
1. **Create debug directory:** Make `/app/debug/auth/page.tsx` as a server component.
2. **Import auth utilities:** Import `auth` from stack-auth.ts and Stack's server app.
3. **Fetch auth state:** Call `await auth()` and `stackServerApp.getUser()` to get both states.
4. **Display debug info:** Show session data, user info, cookies, and environment variables (masked).
5. **Add action buttons:** Include links to test sign-in, sign-out, and protected routes.
6. **Style with Tailwind:** Use existing Tailwind classes for consistent styling.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** Page displays current auth state and helps identify configuration issues.
* **Error Handling:** Gracefully handle null sessions and display "Not authenticated" state.
* **Self-Validation:** Page should load without errors even when not authenticated.

---

## Phase 1, Task 1.3 (Backend): Implement PostgreSQL Row-Level Security
**Objective:** Enable RLS policies on all tables to enforce tenant isolation at the database level.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/lib/db/migrations/0002_add_rls_policies.sql`
  - `/lib/db/tenant-context.ts`
  - `/lib/db/index.ts`
* **Existing Code Snippets:**
  ```typescript
  // Current connection without RLS
  const client = postgres(connectionString);
  export const db = drizzle(client, { schema });
  ```
* **Project Patterns:** Drizzle ORM, PostgreSQL, multi-tenant by companyId

**Detailed Instructions:**
1. **Create migration file:** In `/lib/db/migrations/`, create `0002_add_rls_policies.sql`.
2. **Enable RLS on all tables:** Add `ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;` for each table.
3. **Create tenant policies:** For each table with companyId, create policy: `CREATE POLICY tenant_isolation ON [table] USING (company_id = current_setting('app.company_id')::uuid);`
4. **Handle platform admin:** Create bypass policy for platform_admin role.
5. **Update connection factory:** Modify `/lib/db/index.ts` to set tenant context on connection.
6. **Create withTenant wrapper:** Build a function that sets company context before queries.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** Queries automatically filter by current tenant without explicit WHERE clauses.
* **Error Handling:** Queries without tenant context should fail with clear error messages.
* **Self-Validation:** Create a test script that attempts cross-tenant access and verifies it fails.

---

## Phase 1, Task 1.4 (Backend): Add Global Error Handling
**Objective:** Implement error boundaries and standardized error responses across the application.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/app/error.tsx`
  - Create new: `/lib/errors.ts`
  - Update: `/app/layout.tsx`
* **Existing Code Snippets:** Currently using console.log and unhandled errors
* **Project Patterns:** Next.js 15 error boundaries, server/client components

**Detailed Instructions:**
1. **Create error types:** In `/lib/errors.ts`, define custom error classes (AuthError, ValidationError, TenantError).
2. **Build error boundary:** Create `/app/error.tsx` as a client component with error UI.
3. **Add API error handler:** Create middleware to catch and format API errors consistently.
4. **Implement logging:** Replace console.log with proper error logging (prepare for Sentry).
5. **Add not-found page:** Create `/app/not-found.tsx` for 404 handling.
6. **Update layout:** Ensure error boundary wraps the application properly.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** All errors show user-friendly messages instead of crashing the app.
* **Error Handling:** Different error types show appropriate messages and status codes.
* **Self-Validation:** Throw test errors in different contexts and verify proper handling.

---

# PHASE 2: RAG & Knowledge Base (Week 2-3)
*Implement document processing and semantic search*

## Phase 2, Task 2.1 (Backend): Document Processing Pipeline
**Objective:** Build the complete pipeline to process uploaded documents into searchable chunks with embeddings.

**Context & Current State:**
* **Relevant Files:** 
  - Update: `/app/(dashboard)/admin/documents/upload/route.ts`
  - Create new: `/lib/documents/processor.ts`
  - Create new: `/lib/vectors/embeddings.ts`
* **Existing Code Snippets:**
  ```typescript
  // Current upload endpoint
  export async function POST(request: Request) {
    // Basic file validation exists
  }
  ```
* **Project Patterns:** Edge functions, Blob storage planned, OpenAI embeddings

**Detailed Instructions:**
1. **Install dependencies:** Add `pdf-parse` for PDF extraction, ensure OpenAI client is configured.
2. **Create processor class:** In `/lib/documents/processor.ts`, build DocumentProcessor with methods for each step.
3. **Extract text:** Implement PDF text extraction using pdf-parse, with error handling for corrupted files.
4. **Chunk documents:** Create semantic chunking that preserves context (aim for ~800 tokens per chunk).
5. **Generate embeddings:** Use OpenAI's text-embedding-3-small model for each chunk.
6. **Store in Pinecone:** Save embeddings with metadata (companyId, documentId, chunkIndex).
7. **Update database:** Mark document as processed in knowledgeBaseDocuments table.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** Uploaded PDFs are processed into searchable chunks within 30 seconds.
* **Error Handling:** Failed processing updates document status to 'failed' with error details.
* **Self-Validation:** Process a test PDF and verify chunks appear in Pinecone with correct metadata.

---

## Phase 2, Task 2.2 (Frontend): Document Management UI
**Objective:** Create the document library interface for viewing and managing uploaded documents.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/app/(dashboard)/admin/documents/page.tsx`
  - Use existing: `/components/ui/` components
* **Existing Code Snippets:** Admin layout exists but page is empty
* **Project Patterns:** Server components for data fetching, shadcn/ui components

**Detailed Instructions:**
1. **Create documents page:** Build server component that fetches company documents.
2. **Add document table:** Use DataTable component to display documents with columns: name, type, status, uploaded date.
3. **Implement upload modal:** Create client component for drag-and-drop file upload.
4. **Show processing status:** Display processing progress with status badges (pending, processing, completed, failed).
5. **Add actions menu:** Include options to download, delete, or reprocess documents.
6. **Implement search/filter:** Add search box and filters by type and status.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** Users can view all documents, upload new ones, and track processing status.
* **Error Handling:** Failed uploads show clear error messages with retry option.
* **Self-Validation:** Upload a document and verify it appears in the list with updating status.

---

## Phase 2, Task 2.3 (Backend): Knowledge Search Tool Implementation
**Objective:** Create the searchKnowledge tool that enables the AI to search through processed documents.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/lib/ai/tools/search-knowledge.ts`
  - Update: `/lib/ai/prompts.ts`
* **Existing Code Snippets:**
  ```typescript
  // Tool pattern from existing tools
  export const toolName = tool({
    description: "...",
    parameters: z.object({...}),
    execute: async ({params}) => {...}
  });
  ```
* **Project Patterns:** Vercel AI SDK tool pattern, Zod validation

**Detailed Instructions:**
1. **Create tool file:** Follow existing tool pattern in search-knowledge.ts.
2. **Define parameters:** Use Zod schema with query (string) and limit (number, optional).
3. **Generate query embedding:** Convert search query to embedding using same model as documents.
4. **Search Pinecone:** Query the company namespace with embedding, retrieve top K results.
5. **Format results:** Return structured data with content, source document, and relevance scores.
6. **Add to prompt:** Update system prompt to inform AI about knowledge search capability.
7. **Register tool:** Add to the tools array in the chat route handler.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** AI can search documents and cite sources in responses.
* **Error Handling:** Return empty results with explanation if search fails.
* **Self-Validation:** Ask AI about content from uploaded documents and verify accurate responses.

---

## Phase 2, Task 2.4 (Frontend): Citation Display Component
**Objective:** Build UI components to display document citations in AI responses.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/components/chat/citation.tsx`
  - Update: `/components/message.tsx`
* **Existing Code Snippets:** Message component renders markdown content
* **Project Patterns:** React components, Tailwind styling

**Detailed Instructions:**
1. **Create Citation component:** Build component that displays source document name and page/section.
2. **Parse citations:** Detect citation markers in AI responses (e.g., [1], [2]).
3. **Add citation list:** Show numbered citations at the bottom of messages that have them.
4. **Implement hover preview:** Show excerpt on hover over citation number.
5. **Link to document:** Make citations clickable to open source document.
6. **Style consistently:** Match existing message styling with subtle citation highlighting.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** Citations appear as superscript numbers with source list below message.
* **Error Handling:** Missing documents show "Source unavailable" gracefully.
* **Self-Validation:** Verify citations link to correct document sections.

---

# PHASE 3: Admin Portals - Company Level (Week 4)
*Build company administration features*

## Phase 3, Task 3.1 (Backend): Company Settings API
**Objective:** Create API endpoints for company profile and settings management.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/app/api/company/route.ts`
  - Create new: `/app/api/company/settings/route.ts`
  - Update: `/lib/db/repositories/company.repository.ts`
* **Existing Code Snippets:**
  ```typescript
  // Repository exists but needs methods
  export class CompanyRepository {
    // Basic structure exists
  }
  ```
* **Project Patterns:** Route handlers, repository pattern, tenant context

**Detailed Instructions:**
1. **Create company API route:** Implement GET and PATCH methods for company data.
2. **Add validation:** Use Zod schemas for request body validation.
3. **Implement settings endpoint:** Handle branding, features, and configuration updates.
4. **Add file upload:** Support logo upload using Blob storage.
5. **Ensure tenant isolation:** Verify user can only update their own company.
6. **Add audit logging:** Log all company setting changes.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** Company admins can retrieve and update company settings via API.
* **Error Handling:** Return 403 for unauthorized access, 400 for invalid data.
* **Self-Validation:** Test updating settings and verify changes persist and apply.

---

## Phase 3, Task 3.2 (Frontend): Company Profile Page
**Objective:** Build the company profile and branding configuration interface.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/app/(dashboard)/company-admin/profile/page.tsx`
  - Create new: `/components/company/profile-form.tsx`
* **Existing Code Snippets:** Company admin layout exists
* **Project Patterns:** Server components, form handling with server actions

**Detailed Instructions:**
1. **Create profile page:** Fetch company data in server component.
2. **Build profile form:** Include fields for name, domain, description, contact info.
3. **Add branding section:** Logo upload, primary/secondary colors with preview.
4. **Implement subdomain config:** Allow setting custom subdomain with validation.
5. **Create save action:** Use server action to update company via API.
6. **Add success feedback:** Show toast on successful save.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** Company admins can view and edit all company settings.
* **Error Handling:** Show field-level validation errors clearly.
* **Self-Validation:** Make changes and verify they appear after page refresh.

---

## Phase 3, Task 3.3 (Backend): Benefits Plan Management API
**Objective:** Create comprehensive CRUD API for managing benefit plans.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/app/api/benefits/plans/route.ts`
  - Create new: `/app/api/benefits/plans/[id]/route.ts`
  - Update: `/lib/db/repositories/benefitPlans.ts`
* **Existing Code Snippets:**
  ```typescript
  // Schema exists
  export const benefitPlans = pgTable('benefit_plans', {
    // All fields defined
  });
  ```
* **Project Patterns:** RESTful APIs, tenant filtering

**Detailed Instructions:**
1. **Create plans list endpoint:** GET method with pagination, filtering by type and status.
2. **Implement create plan:** POST method with full validation of plan details.
3. **Add individual plan routes:** GET, PATCH, DELETE methods for single plans.
4. **Build bulk operations:** Support bulk activate/deactivate for enrollment periods.
5. **Add plan copying:** Endpoint to duplicate plans for new year.
6. **Implement validation:** Ensure all monetary values, dates, and percentages are valid.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** Complete CRUD operations for benefit plans with proper validation.
* **Error Handling:** Prevent deletion of plans with active enrollments.
* **Self-Validation:** Create, update, and delete test plans to verify all operations.

---

## Phase 3, Task 3.4 (Frontend): Benefits Configuration Interface
**Objective:** Build the comprehensive benefits plan management UI.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/app/(dashboard)/company-admin/benefits/page.tsx`
  - Create new: `/components/benefits/plan-form.tsx`
  - Create new: `/components/benefits/plan-list.tsx`
* **Existing Code Snippets:** Existing benefit plan types and components
* **Project Patterns:** Data tables, modal forms, server components

**Detailed Instructions:**
1. **Create benefits page:** List all plans grouped by type (health, dental, vision, etc.).
2. **Build plan cards:** Display key info: name, type, cost, enrollment count.
3. **Add create button:** Opens modal with comprehensive plan form.
4. **Implement plan form:** Dynamic fields based on plan type, cost structures, coverage details.
5. **Add comparison view:** Allow side-by-side plan comparison for verification.
6. **Build bulk actions:** Activate/deactivate multiple plans, copy to new year.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** Complete UI for managing all aspects of benefit plans.
* **Error Handling:** Validate costs and percentages, prevent invalid configurations.
* **Self-Validation:** Create a new plan and verify it appears in employee tools.

---

# PHASE 4: Admin Portals - HR & Employee Features (Week 5)
*Build HR tools and employee dashboard*

## Phase 4, Task 4.1 (Backend): Employee Management API
**Objective:** Create APIs for employee roster management and bulk operations.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/app/api/employees/route.ts`
  - Create new: `/app/api/employees/import/route.ts`
  - Update: `/lib/db/repositories/user.repository.ts`
* **Existing Code Snippets:**
  ```typescript
  // User repository exists
  export class UserRepository extends TenantAwareRepository<User> {
    // Needs employee-specific methods
  }
  ```
* **Project Patterns:** CSV processing, bulk operations

**Detailed Instructions:**
1. **Create employee list API:** GET with pagination, search, and department filters.
2. **Add individual operations:** GET, PATCH, DELETE for single employees.
3. **Build CSV import:** Parse CSV, validate data, bulk create with transaction.
4. **Implement bulk updates:** Support department changes, role updates, deactivation.
5. **Add export endpoint:** Generate CSV of current employees with all fields.
6. **Create invitation system:** Send Stack Auth invitations for new employees.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** Complete employee management via API with bulk operations.
* **Error Handling:** Return detailed errors for CSV import issues with row numbers.
* **Self-Validation:** Import 100 employees via CSV and verify all created correctly.

---

## Phase 4, Task 4.2 (Frontend): Employee Management Interface
**Objective:** Build the employee roster UI with import/export capabilities.

**Context & Current State:**
* **Relevant Files:** 
  - Update: `/app/(dashboard)/company-admin/employees/page.tsx`
  - Create new: `/components/employees/import-modal.tsx`
  - Create new: `/components/employees/employee-table.tsx`
* **Existing Code Snippets:** Basic page exists but empty
* **Project Patterns:** Data tables with actions, file upload

**Detailed Instructions:**
1. **Enhance employees page:** Add search bar, filters, and action buttons.
2. **Build employee table:** Columns for name, email, department, role, status, actions.
3. **Add import modal:** Drag-drop CSV upload with preview and field mapping.
4. **Implement inline editing:** Allow quick edits to department and role.
5. **Create employee details:** Slide-over panel with full employee information.
6. **Add bulk actions:** Select multiple employees for bulk operations.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** Full employee management with smooth import/export flow.
* **Error Handling:** Show clear error messages for import failures with downloadable error report.
* **Self-Validation:** Import, edit, and export employees to verify round-trip data integrity.

---

## Phase 4, Task 4.3 (Backend): HR Analytics API
**Objective:** Create analytics endpoints for HR insights and reporting.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/app/api/analytics/hr/route.ts`
  - Create new: `/lib/analytics/hr-metrics.ts`
* **Existing Code Snippets:** Analytics events table exists but no aggregation
* **Project Patterns:** Time-series data, aggregation queries

**Detailed Instructions:**
1. **Create metrics calculator:** Build service to calculate key HR metrics.
2. **Implement usage endpoint:** Return chat usage by department, common questions.
3. **Add engagement metrics:** Active users, feature adoption, satisfaction scores.
4. **Build trending endpoint:** Most asked questions over time with change indicators.
5. **Create export functionality:** Generate CSV/PDF reports for leadership.
6. **Add caching layer:** Cache expensive aggregations for performance.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** HR can access detailed analytics about benefits usage.
* **Error Handling:** Return empty data sets with clear messages when no data exists.
* **Self-Validation:** Generate test analytics data and verify calculations are correct.

---

## Phase 4, Task 4.4 (Frontend): Employee Dashboard
**Objective:** Build the personalized employee dashboard with benefits overview.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/app/(dashboard)/dashboard/page.tsx`
  - Update: `/components/benefits-dashboard.tsx`
* **Existing Code Snippets:** BenefitsDashboard component exists for AI display
* **Project Patterns:** Server components, real user data

**Detailed Instructions:**
1. **Create dashboard page:** Fetch user's enrollments and company benefits.
2. **Add welcome section:** Personalized greeting with quick actions.
3. **Show current coverage:** Cards for each enrolled benefit with key details.
4. **Add important dates:** Upcoming deadlines, enrollment periods, claim deadlines.
5. **Include cost summary:** YTD spending, remaining deductibles, HSA balance.
6. **Build quick actions:** Buttons for common tasks (view ID card, find provider).

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** Employees see personalized dashboard immediately after login.
* **Error Handling:** Show helpful empty states when no enrollments exist.
* **Self-Validation:** Login as employee and verify dashboard shows correct personal data.

---

# PHASE 5: Analytics & Reporting (Week 6)
*Build comprehensive analytics for all user types*

## Phase 5, Task 5.1 (Backend): Analytics Data Pipeline
**Objective:** Create the data pipeline for collecting and aggregating analytics events.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/lib/analytics/collector.ts`
  - Create new: `/lib/analytics/aggregator.ts`
  - Update: `/app/api/events/route.ts`
* **Existing Code Snippets:**
  ```typescript
  // Analytics events table exists
  export const analyticsEvents = pgTable('analytics_events', {
    // Schema defined
  });
  ```
* **Project Patterns:** Event-driven analytics, time-series data

**Detailed Instructions:**
1. **Create event collector:** Service to standardize and validate analytics events.
2. **Build event API:** POST endpoint for client-side event tracking.
3. **Implement aggregator:** Background job to pre-calculate common metrics.
4. **Add real-time processing:** Stream events for immediate dashboard updates.
5. **Create retention policy:** Auto-archive old events to maintain performance.
6. **Build metric definitions:** Standardize KPIs across the platform.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** All user interactions generate analytics events with proper context.
* **Error Handling:** Failed events are queued for retry, never lost.
* **Self-Validation:** Trigger test events and verify they appear in aggregated metrics.

---

## Phase 5, Task 5.2 (Frontend): Analytics Dashboard
**Objective:** Build the comprehensive analytics dashboard for company administrators.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/app/(dashboard)/company-admin/analytics/page.tsx`
  - Create new: `/components/analytics/metric-card.tsx`
  - Create new: `/components/analytics/chart-widget.tsx`
* **Existing Code Snippets:** No analytics UI exists yet
* **Project Patterns:** Data visualization, real-time updates

**Detailed Instructions:**
1. **Create analytics page:** Grid layout with metric cards and charts.
2. **Build KPI cards:** Total users, active users, questions answered, satisfaction.
3. **Add usage chart:** Time-series line chart of daily active users.
4. **Create question analytics:** Bar chart of most common question categories.
5. **Implement department breakdown:** Pie chart of usage by department.
6. **Add export button:** Download data as CSV or generate PDF report.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** Administrators see real-time analytics with interactive charts.
* **Error Handling:** Show loading states and error messages for failed data fetches.
* **Self-Validation:** Verify metrics match raw data counts in database.

---

## Phase 5, Task 5.3 (Backend): Automated Reporting System
**Objective:** Build scheduled report generation and distribution system.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/lib/reports/generator.ts`
  - Create new: `/lib/reports/templates/`
  - Create new: `/app/api/reports/route.ts`
* **Existing Code Snippets:** No reporting system exists
* **Project Patterns:** PDF generation, email integration

**Detailed Instructions:**
1. **Create report generator:** Service to compile data and generate formatted reports.
2. **Build report templates:** HTML templates for weekly, monthly, quarterly reports.
3. **Implement PDF generation:** Convert HTML reports to PDF with charts.
4. **Add scheduling system:** Cron jobs for automated report generation.
5. **Create distribution:** Email reports to configured recipients.
6. **Build on-demand API:** Allow manual report generation with custom date ranges.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** Reports automatically generated and sent on schedule.
* **Error Handling:** Failed reports retry and alert administrators.
* **Self-Validation:** Generate test report and verify data accuracy and formatting.

---

## Phase 5, Task 5.4 (Frontend): HR Conversation Monitoring
**Objective:** Build the interface for HR to monitor and respond to employee conversations.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/app/(dashboard)/hr-admin/conversations/page.tsx`
  - Create new: `/components/conversations/conversation-list.tsx`
  - Create new: `/components/conversations/conversation-viewer.tsx`
* **Existing Code Snippets:** HR admin role exists but no UI
* **Project Patterns:** Real-time updates, privacy considerations

**Detailed Instructions:**
1. **Create conversations page:** List view of recent employee conversations.
2. **Add filters:** By date, status (needs attention, resolved), employee.
3. **Build conversation viewer:** Read-only view of full conversation with context.
4. **Implement flagging:** Allow HR to flag conversations for follow-up.
5. **Add knowledge gaps:** Highlight unanswered questions for content updates.
6. **Create response interface:** Allow HR to add private notes or public responses.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** HR can monitor conversations and identify issues requiring attention.
* **Error Handling:** Respect privacy settings and show appropriate access messages.
* **Self-Validation:** Create test conversation and verify HR can view and annotate.

---

# PHASE 6: Testing & Security Hardening (Week 7-8)
*Achieve 80% test coverage and implement security best practices*

## Phase 6, Task 6.1 (Backend): Comprehensive Test Suite
**Objective:** Build unit and integration tests to achieve 80% code coverage.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/tests/unit/` directory structure
  - Create new: `/tests/integration/` directory structure
  - Update: `/vitest.config.ts`
* **Existing Code Snippets:** Minimal tests exist, ~15% coverage
* **Project Patterns:** Vitest for unit tests, API testing

**Detailed Instructions:**
1. **Configure test environment:** Set up test database, mock external services.
2. **Write repository tests:** Test all CRUD operations with tenant isolation.
3. **Test API endpoints:** Full coverage of happy paths and error cases.
4. **Add AI tool tests:** Mock LLM responses, test tool execution.
5. **Test authentication flows:** Cover login, logout, session management.
6. **Create test utilities:** Factories for creating test data consistently.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** 80% or higher test coverage with all tests passing.
* **Error Handling:** Tests cover error scenarios and edge cases.
* **Self-Validation:** Run coverage report and verify no critical paths are untested.

---

## Phase 6, Task 6.2 (Frontend): Component and E2E Testing
**Objective:** Build component tests and end-to-end user journey tests.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/tests/components/` directory
  - Update: `/tests/e2e/` test files
  - Update: `/playwright.config.ts`
* **Existing Code Snippets:** Basic Playwright setup exists
* **Project Patterns:** Playwright for E2E, React Testing Library

**Detailed Instructions:**
1. **Set up component testing:** Configure Vitest for React component tests.
2. **Test key components:** BenefitsDashboard, PlanComparison, CostCalculator.
3. **Create E2E journeys:** Employee enrollment, HR monitoring, admin configuration.
4. **Add visual regression:** Screenshot tests for key UI states.
5. **Test responsive design:** Verify mobile and tablet layouts work correctly.
6. **Build test data seeding:** Consistent test data for E2E tests.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** All critical user journeys have E2E test coverage.
* **Error Handling:** Tests handle loading states and error conditions.
* **Self-Validation:** Run full E2E suite and verify no flaky tests.

---

## Phase 6, Task 6.3 (Backend): API Input Validation
**Objective:** Implement comprehensive input validation using Zod schemas across all API endpoints.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/lib/validation/schemas.ts`
  - Update: All API route files
  - Create new: `/lib/middleware/validation.ts`
* **Existing Code Snippets:** Some Zod schemas exist but not enforced
* **Project Patterns:** Zod for validation, middleware pattern

**Detailed Instructions:**
1. **Create validation schemas:** Define Zod schemas for all API request/response types.
2. **Build validation middleware:** Generic middleware to validate against schemas.
3. **Apply to all endpoints:** Add validation to every API route handler.
4. **Implement type inference:** Use Zod inference for TypeScript types.
5. **Add custom validators:** Email, phone, SSN formats with privacy.
6. **Create error formatter:** Consistent validation error responses.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** All API endpoints reject invalid input with clear error messages.
* **Error Handling:** Validation errors return 400 with field-specific errors.
* **Self-Validation:** Test each endpoint with invalid data and verify proper rejection.

---

## Phase 6, Task 6.4 (Backend): Security Headers and Rate Limiting
**Objective:** Implement security headers, rate limiting, and CSRF protection.

**Context & Current State:**
* **Relevant Files:** 
  - Update: `/middleware.ts`
  - Create new: `/lib/security/rate-limiter.ts`
  - Update: `/next.config.js`
* **Existing Code Snippets:** Basic middleware exists for auth
* **Project Patterns:** Next.js middleware, edge functions

**Detailed Instructions:**
1. **Add security headers:** CSP, X-Frame-Options, X-Content-Type-Options, etc.
2. **Implement rate limiting:** Use Upstash Redis for distributed rate limiting.
3. **Add CSRF protection:** Generate and validate CSRF tokens for state-changing operations.
4. **Configure CORS properly:** Restrict origins to known domains.
5. **Add request logging:** Log all API requests for audit trail.
6. **Implement IP blocking:** Allow blocking suspicious IPs.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** All security headers present, rate limiting prevents abuse.
* **Error Handling:** Rate limited requests return 429 with retry-after header.
* **Self-Validation:** Use security header checker tools to verify configuration.

---

# PHASE 7: Production Readiness & Launch (Week 9-10)
*Performance optimization, monitoring, and deployment*

## Phase 7, Task 7.1 (Backend): Performance Optimization
**Objective:** Optimize database queries, implement caching, and improve response times.

**Context & Current State:**
* **Relevant Files:** 
  - Update: All repository files
  - Create new: `/lib/cache/index.ts`
  - Update: Database indexes
* **Existing Code Snippets:** No caching implemented, some slow queries
* **Project Patterns:** Redis for caching, query optimization

**Detailed Instructions:**
1. **Add database indexes:** Create indexes for all foreign keys and common query patterns.
2. **Implement query caching:** Cache frequently accessed data (plans, company settings).
3. **Add connection pooling:** Configure optimal pool size for Neon.
4. **Optimize N+1 queries:** Use joins and batching to reduce query count.
5. **Add response caching:** Cache API responses with appropriate TTLs.
6. **Implement lazy loading:** Defer loading of non-critical data.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** All API responses under 200ms P95, chat responses under 2s.
* **Error Handling:** Cache misses gracefully fall back to database.
* **Self-Validation:** Run load tests and verify performance targets are met.

---

## Phase 7, Task 7.2 (Frontend): Production Build Optimization
**Objective:** Optimize bundle size, implement code splitting, and improve load times.

**Context & Current State:**
* **Relevant Files:** 
  - Update: `/next.config.js`
  - Update: Component imports
  - Create new: `/lib/utils/lazy-load.ts`
* **Existing Code Snippets:** No optimization implemented
* **Project Patterns:** Next.js optimization features

**Detailed Instructions:**
1. **Enable production optimizations:** Configure Next.js for optimal production builds.
2. **Implement code splitting:** Lazy load heavy components (charts, editors).
3. **Optimize images:** Use Next.js Image component with proper sizing.
4. **Remove unused CSS:** Configure PurgeCSS for Tailwind.
5. **Add bundle analyzer:** Identify and eliminate large dependencies.
6. **Implement service worker:** For offline capability and caching.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** Initial page load under 1s, TTI under 3s.
* **Error Handling:** Lazy loaded components show loading states.
* **Self-Validation:** Run Lighthouse audit and achieve 90+ scores.

---

## Phase 7, Task 7.3 (Backend): Monitoring and Observability
**Objective:** Implement comprehensive monitoring, logging, and alerting.

**Context & Current State:**
* **Relevant Files:** 
  - Create new: `/lib/monitoring/index.ts`
  - Update: All service files
  - Create new: `/lib/monitoring/alerts.ts`
* **Existing Code Snippets:** Console.log used throughout
* **Project Patterns:** Structured logging, metrics collection

**Detailed Instructions:**
1. **Integrate Sentry:** Add error tracking with source maps.
2. **Implement structured logging:** Replace console.log with proper logger.
3. **Add custom metrics:** Track business KPIs (enrollments, questions answered).
4. **Create health checks:** Endpoints for monitoring service health.
5. **Set up alerts:** Configure alerts for errors, performance, and business metrics.
6. **Build status page:** Public status page showing system health.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** All errors tracked, metrics visible in dashboards.
* **Error Handling:** Errors include context for debugging.
* **Self-Validation:** Trigger test error and verify it appears in Sentry.

---

## Phase 7, Task 7.4 (Full Stack): Production Deployment Setup
**Objective:** Configure production environment with all necessary services and security.

**Context & Current State:**
* **Relevant Files:** 
  - Update: `/vercel.json`
  - Create new: `/scripts/deploy-prod.sh`
  - Update: Environment configuration
* **Existing Code Snippets:** Basic Vercel configuration exists
* **Project Patterns:** Vercel deployment, environment isolation

**Detailed Instructions:**
1. **Set up production environment:** Configure all production environment variables.
2. **Enable Vercel protections:** DDoS protection, firewall rules.
3. **Configure custom domain:** Set up production domain with SSL.
4. **Set up backups:** Automated database backups with point-in-time recovery.
5. **Create deployment checklist:** Document all deployment steps.
6. **Implement rollback procedure:** Quick rollback capability for emergencies.

**Acceptance Criteria & Self-Healing:**
* **Expected Outcome:** Production environment fully configured and secure.
* **Error Handling:** Deployment failures automatically rollback.
* **Self-Validation:** Deploy to production and verify all features work correctly.

---

# Live Testing Protocols

## Phase 1 Testing Protocol
1. Deploy auth fixes to staging
2. Navigate to `/debug/auth` and verify session information displays
3. Test complete sign-in flow without redirect loops
4. Create test query as different tenant and verify data isolation
5. Trigger intentional error and verify user-friendly error page

## Phase 2 Testing Protocol
1. Upload a benefits PDF document
2. Monitor processing status until complete
3. Ask AI chatbot about content from the document
4. Verify response includes accurate information with citations
5. Click citation to verify it links to correct document

## Phase 3 Testing Protocol
1. Login as company administrator
2. Update company branding and verify changes apply
3. Create new benefit plan with all details
4. Switch to employee view and verify new plan appears
5. Test CSV import with 50 employee records

## Phase 4 Testing Protocol
1. Login as HR administrator
2. View conversation list and filter by date
3. Import employees via CSV and verify success
4. Check analytics dashboard for accurate metrics
5. Login as employee and verify personalized dashboard

## Phase 5 Testing Protocol
1. Generate user activity for 30 minutes
2. Check analytics dashboard for real-time updates
3. Generate weekly report and verify email delivery
4. Verify all charts display correct data
5. Export data and validate against raw database

## Phase 6 Testing Protocol
1. Run full test suite: `pnpm test`
2. Verify coverage report shows >80%
3. Run E2E tests: `pnpm test:e2e`
4. Test API endpoints with invalid data
5. Check security headers using online tools

## Phase 7 Testing Protocol
1. Run load test with 1000 concurrent users
2. Monitor response times and error rates
3. Verify all alerts fire correctly
4. Test rollback procedure with staging deployment
5. Perform full production smoke test

---

# Success Criteria
- ✅ All user journeys functional from start to finish
- ✅ 80% test coverage achieved with passing tests
- ✅ Response times: API <200ms, Chat <2s, Page loads <1s
- ✅ Zero critical security vulnerabilities
- ✅ Successful load test with 1000 concurrent users
- ✅ All documentation complete and accurate
- ✅ Production environment stable for 48 hours

This roadmap transforms the Benefits AI Platform from its current state to production-ready in 10 weeks, with each task carefully sequenced to enable continuous testing and validation.