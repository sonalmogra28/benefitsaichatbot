# Data Audit Report: Admin & Super Admin Profiles

**Date:** 2025-08-04

## 1. Purpose
This report catalogs all data elements accessed by the Admin and Super Admin user journeys, traces data flows, identifies compliance risks, and provides actionable recommendations.

## 2. Admin Profile Data Fields
| Field                  | Source System         | Description                                | Sensitivity Level |
|------------------------|-----------------------|--------------------------------------------|-------------------|
| `id`                   | PostgreSQL (users)    | Internal user identifier                   | Low               |
| `email`                | PostgreSQL (users)    | User login and notification address        | Medium            |
| `name`                 | PostgreSQL (users)    | Display name                               | Low               |
| `companyId`            | PostgreSQL (users)    | Tenant/organization reference              | Low               |
| `roles`                | PostgreSQL (users)    | Assigned roles (e.g., Admin, Editor)       | Medium            |
| `usageMetrics`         | Application Logs      | Dashboard metrics: login counts, queries   | Medium            |
| `settings`             | PostgreSQL (companies)| Organization-specific feature flags, UI    | Low               |

### 2.1 Data Flow: Admin
1. Admin logs in via Stack Auth → session token generated.
2. `AuthAgent` middleware retrieves `userId` → queries `users` table.
3. Fetches `usageMetrics` from telemetry service.
4. Renders Admin dashboard with combined data.
5. All read operations logged via auditing hooks.

## 3. Super Admin Profile Data Fields
| Field                  | Source System         | Description                                | Sensitivity Level |
|------------------------|-----------------------|--------------------------------------------|-------------------|
| `allTenants`           | PostgreSQL (companies)| Full list of tenant organizations          | High              |
| `systemLogs`           | Application Logs      | Error, access, and change logs             | High              |
| `securityEvents`       | Security Monitoring   | Unauthorized access, anomaly events        | High              |
| `globalSettings`       | PostgreSQL (settings) | Feature toggles and global config values   | Medium            |

### 3.1 Data Flow: Super Admin
1. Super Admin session validated via `AuthAgent` with elevated roles.
2. Queries `companies` table for `allTenants` list.
3. Aggregates system logs from logging service (e.g., Grafana).
4. Retrieves security events from monitoring pipeline.
5. Presents unified Super Admin console view.
6. All actions write to audit log with `superAdminId` and timestamp.

## 4. Audit Findings
- **Excessive Access:** Super Admin can view all tenant data without field-level filters.
- **Logging Gaps:** Application logs contain raw PII in error messages.
- **Incomplete Encryption:** `usageMetrics` stored in plaintext.

## 5. Recommendations
1. **Least Privilege:** Implement row-level security on sensitive tables for Super Admin.
2. **Field-Level Encryption:** Encrypt `usageMetrics` and `securityEvents` at rest.
3. **PII Redaction:** Mask PII in error logs before storage.
4. **Audit Trails:** Extend auditing hooks to include request origin and context.
5. **Periodic Review:** Schedule quarterly data access reviews and penetration tests.

*End of Data Audit Report.*
