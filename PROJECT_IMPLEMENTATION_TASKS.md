# Project Implementation Tasks

This file outlines exact deliverables for the rest of the project (backend, data layer, middleware, email, instrumentation, testing, deployment) with file-level tasks to get to production readiness.

---

## 1. Data Models & Database (Drizzle)

- File: `drizzle.config.ts`
  - [ ] Define tables for `employees`, `companies`, `documents`, `benefits`, `audit_logs`, `users`, `exports`, `settings`.
  - [ ] Create migration scripts to add new columns for branding assets (logo_url, favicon_url) on `companies`.

- File: `lib/db.ts`
  - [ ] Export typed queries for all new tables.
  - [ ] Add helper functions: `getCompanyById`, `upsertUserSettings`, `listBenefitsByCompany`.

## 2. API Routes & Business Logic

- Folder: `app/api/company-admin/employees` (all `.ts` files)
  - [ ] Implement `GET` handler for `/api/company-admin/employees` with pagination, search.
  - [ ] Implement `POST` for creating employees.
  - [ ] Implement `PATCH` for updating role/status.
  - [ ] Implement `DELETE` for suspending employees.

- Folder: `app/api/super-admin/companies`:
  - [ ] Implement CRUD handlers for companies including branding uploads (use `next/image` storage or S3).

- Folder: `app/api/super-admin/users`:
  - [ ] Handlers for listing all users, bulk actions (suspend, change role, delete).

- Folder: `app/api/export`:
  - [ ] Implement `/api/super-admin/export` POST handler to generate CSV/JSON per `exportSchema`.

- Folder: `app/api/auth`:
  - [ ] Validate endpoints in `middleware.ts` and refine error responses.

## 3. Middleware & Auth

- File: `middleware.ts`
  - [ ] Enforce route protection for `/company-admin` and `/super-admin` with role checks.
  - [ ] Add redirect logic to `/handler/sign-in` when unauthorized.

- File: `auth-middleware.ts`
  - [ ] Add unit tests for session validation, token expiry, and error cases.

## 4. Email System

- File: `scripts/email.ts`
  - [ ] Define templates for onboarding, password reset, document notifications.
  - [ ] Integrate with SendGrid/Mailgun and environment variables.

- File: `app/api/notifications`:
  - [ ] API endpoint to trigger emails on document upload or benefit enrollment.

## 5. Instrumentation & Logging

- File: `instrumentation.ts`
  - [ ] Integrate `OpenTelemetry` or `Sentry` for error tracking.
  - [ ] Wrap all API handlers and UI pages for performance metrics.

## 6. Testing

- Folder: `__tests__`
  - [ ] Add unit tests for every new API handler.
  - [ ] Coverage for data layer helpers.

- Folder: `tests/playwright`
  - [ ] Write end-to-end tests for: employee workflows, company creation, export.
  - [ ] Accessibility smoke tests (keyboard nav, color contrast).

- File: `vitest.config.ts`
  - [ ] Configure `coverage` reporter and thresholds >= 80%.

## 7. Deployment & CI/CD

- File: `.github/workflows/ci.yml` (create if missing)
  - [ ] Setup actions: `checkout`, `install pnpm`, `pnpm install`, `pnpm run lint`, `pnpm test`, `pnpm build`.

- File: `vercel.json`
  - [ ] Validate environment variable definitions for production and preview.
  - [ ] Configure image domains for logos.

- File: `package.json`
  - [ ] Add scripts: `lint`, `format`, `type-check`, `prebuild`, `postdeploy`.

## 8. Documentation & QA

- File: `README.md`
  - [ ] Update setup instructions for new environment variables and database migrations.

- File: `docs/` folder
  - [ ] Add API reference for new endpoints.
  - [ ] Add architecture diagram in `docs/architecture.md`.

- File: `START_HERE.md`
  - [ ] Include high-level overview of project flow and where to find each module.

---

**Next Steps:**

1. Assign each line item as a ticket.  
2. Implement and test in parallel.  
3. Review, QA, and deploy.  
4. Monitor and refine based on metrics.  

