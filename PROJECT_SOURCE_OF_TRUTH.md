# Project Source of Truth

This document serves as the single source of truth for the Benefits Chatbot project. It consolidates all high-level modules, responsibilities, task trackers, and reference materials in one place. Do not delete archived files—this file links to all relevant artifacts.

---

## 1. Project Overview

- **Name:** Benefits Chatbot
- **Description:** AI-powered platform for company benefits management, document handling, and chat interactions.
- **Owner:** prettygood-work
- **Branch:** main
- **Contact:** project owner and Slack channel

## 2. Core Modules

### 2.1 User Interfaces

- **Company Admin UI:** `app/company-admin/`  
  Tasks: see [UI Implementation Tasks](UI_IMPLEMENTATION_TASKS.md)

- **Super Admin UI:** `app/super-admin/`  
  Tasks: see [UI Implementation Tasks](./UI_IMPLEMENTATION_TASKS.md)

### 2.2 Data & Business Logic

- **Data Models & Migrations:** `drizzle.config.ts`, `migrations/`  
  Tasks: see [Project Implementation Tasks](./PROJECT_IMPLEMENTATION_TASKS.md)

- **API Routes:** `app/api/`  
  Company Admin, Super Admin, Export, Notifications, Auth endpoints

### 2.3 Authentication & Middleware

- **Auth Provider:** Stack Auth integration in `stack.ts`  
- **Middleware:** `middleware.ts`, `auth-middleware.ts`

### 2.4 Email & Notifications

- **Email Scripts:** `scripts/email.ts`  
- **Notification API:** `app/api/notifications`

### 2.5 Instrumentation & Logging

- **Instrumentation:** `instrumentation.ts`  
- **Error Tracking:** Sentry/OpenTelemetry

### 2.6 Testing

- **Unit Tests:** `__tests__/`, `vitest.config.ts`  
- **E2E Tests:** `tests/playwright/`

### 2.7 Deployment & CI/CD

- **CI Workflow:** `.github/workflows/ci.yml`  
- **Vercel Config:** `vercel.json`  
- **Scripts:** `package.json` (`build`, `lint`, `test`)

## 3. Documentation & Archives

- **Primary Docs:**  
  - `README.md`  
  - `START_HERE.md`  
  - `docs/architecture.md`, API references in `docs/`

- **Archived Task Lists:**  
  - [UI Tasks (archived)](UI_IMPLEMENTATION_TASKS.md)  
  - [Project Tasks (archived)](PROJECT_IMPLEMENTATION_TASKS.md)  

- **Audit & Reports:**  
  - `COMPREHENSIVE_PROJECT_AUDIT.md`  
  - `CLEANUP_COMPLETION_REPORT.md`  
  - `MASTER_DEVELOPMENT_ROADMAP.md`

## 4. Status Trackers

Use GitHub Projects or other ticketing system to track progress per section above. Link tickets back to specific file paths.

## 5. How to Use

1. Read this file first to orient on modules.  
2. Drill into task trackers listed in sections 2.1–2.7.  
3. Archive completed trackers to `/archive/`.  
4. Update this file when adding modules or moving artifacts.  

---

Last updated: August 6, 2025
