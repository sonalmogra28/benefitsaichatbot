# Benefits Assistant Chatbot – Development Roadmap (v2.0)

_Last updated: 2025-07-19_

This roadmap supersedes previous drafts. It captures the **current audit plan**, an **updated Phase 1 schedule**, deferred items, and a live **technical-debt registry**. All dates assume PST.

---

## 1  Audit & Verification Checklist
Record pass/fail with reproducible PoW (logs, screenshots, test reports).

| # | Area | Verification Steps | Owner | Due |
|---|------|-------------------|--------|-----|
|1|Multi-tenant schema| • Inspect migrations<br>• Verify FKs & indexes<br>• Run `describe` on Neon<br>• Insert cross-tenant data → confirm isolation|DB Lead|07-22|
|2|Sample-data script| • Run script twice (idempotent)<br>• Check date serialisation<br>• Validate counts per tenant|DB Lead|07-22|
|3|AI tools (real data)| • Execute `scripts/test-ai-tools.ts`<br>• Inspect query plans for tenant filters|AI Lead|07-23|
|4|Environment handling| • Ensure `.env.*` loaded in scripts & CI<br>• Remove hard-coded secrets|Infra|07-23|
|5|Error handling & logging| • Simulate DB offline & network drop<br>• Verify graceful errors + Sentry capture|Backend|07-24|
|6|Unit & integration tests| • Run `pnpm test` → coverage ≥ 80 % lines<br>• Attach coverage report|QA|07-25|
|7|CI/CD pipeline| • Lint, build, test, type-check on PR<br>• Block merge on failures|Dev Ex|07-25|
|8|Docs & PoW| • Confirm `claude.md` and diagrams current|Tech Writer|07-26|

---

## 2  Phase 1 Remaining Scope (07-19 → 08-16)

### 2.1  Week 1 (07-19 → 07-26) – Validation & Repositories
- [ ] Implement **Zod** schemas for all entities & API boundaries
- [ ] Refactor Drizzle repositories (`BenefitsRepository`, `UserRepository`, …) with full CRUD + typings
- [ ] Achieve ≥ 80 % unit-test coverage on repositories
- [ ] Centralised **error handler** & **Sentry** integration

### 2.2  Week 2 (07-27 → 08-02) – Document Upload MVP
- [ ] Drag-and-drop file-upload UI (Next.js + Tailwind)
- [ ] API route to receive file, store in **Upstash KV** (S3 later)
- [ ] Integrate **PDF.js** for preview & text extraction (≥ 80 % success)
- [ ] Background queue (edge function) to process PDFs

### 2.3  Week 3 (08-03 → 08-09) – Knowledge Base v0
- [ ] DB schema `knowledge_base_documents`, `knowledge_base_chunks`
- [ ] CRUD API & admin UI
- [ ] Keyword search (SQL ILIKE) – vector search deferred
- [ ] AI tool wrapper: search KB first, then fallback to benefits data

### 2.4  Week 4 (08-10 → 08-16) – Observability & Hardening
- [ ] Analytics events table & client helper
- [ ] Dashboard route for basic metrics
- [ ] Retry logic & exponential back-off for external calls
- [ ] Load & stress testing; target < 2 s P95 response
- [ ] Phase 1 acceptance review + sign-off

---

## 3  Items Deferred to Phase 2
| Feature | Reason |
|---------|--------|
|Clerk auth migration|High integration risk; keep enhanced NextAuth until Phase 2|
|Vector search (Pinecone)|Infra not ready; keyword search sufficient for now|
|Advanced analytics dashboard|Requires events data from Phase 1|
|Employer admin portal UI|Depends on permission system|

---

## 4  Technical-Debt Registry
| ID | Description | Severity | Owner | Fix Sprint |
|----|-------------|----------|-------|-----------|
|TD-01|Hard-coded Neon fallback URL in scripts|High|Infra|Week 1|
|TD-02|Legacy AI tool duplicates in `lib/ai/tools`|Medium|AI Lead|Week 1|
|TD-03|No central logging utility|Medium|Backend|Week 1|
|TD-04|Incomplete Drizzle relation helpers|High|DB Lead|Week 1|
|TD-05|Missing tests for migrations|Medium|QA|Week 2|
|TD-06|No file-storage abstraction|Medium|Infra|Week 2|

---

## Completed Phase 1 Items (as of 2025-07-19)
- ✅ Multi-tenant database schema created and migrated (companies, users, benefit_plans, enrollments, knowledge_base, chats, messages, votes, analytics_events)
- ✅ Idempotent **sample-data** script with date-string handling and upsert logic
- ✅ AI tools (`compare-benefits-plans`, etc.) now query real data with tenant filters
- ✅ End-to-end test script (`scripts/test-ai-tools.ts`) passes against Neon
- ✅ Basic relation helpers added to Drizzle schema enabling relational queries

---

## 5  Success Metrics (Revised)
- ≥ 80 % PDF-processing success
- ≥ 80 % automated-test coverage
- P95 latency < 2 s for all critical endpoints
- Zero **critical** bugs in error tracking for 7 consecutive days pre-sign-off

---

## 6  Communication Protocol
The team will **not** request direction for tasks explicitly covered by this roadmap. Blockers will be surfaced asynchronously. User feedback is always welcome but not required for planned work.

---

_End of document_
