# API Contracts

This document maps frontend pages to their corresponding server endpoints and documents the response contracts.

## Employee

- **Component**: `components/benefits-dashboard.tsx`
  - **Endpoint**: `GET /api/employee/benefits`
  - **Response**: [`BenefitsSummary`](../types/api.ts)
  - **Errors**: `500` returns `{ error: string }`

## Super Admin

- **Page**: `app/super-admin/page.tsx`
  - **Endpoint**: `GET /api/super-admin/stats`
  - **Response**: [`SuperAdminStats`](../types/api.ts)
  - **Errors**: `401` unauthorized, `403` forbidden, `500` internal error

- **Page**: `app/super-admin/users/page.tsx`
  - **Endpoints**:
    - `GET /api/admin/users` → `{ users: [] }`
    - `POST /api/admin/users/:uid/assign-role` → `{ success: boolean }`

- **Page**: `app/super-admin/users/assign-role/page.tsx`
  - **Endpoints**:
    - `GET /api/super-admin/users` → `{ users: [] }`
    - `PATCH /api/super-admin/users/:id` → `{ success: boolean }`

## Company Admin

- **Page**: `app/company-admin/settings/integrations/page.tsx`
  - **Endpoint**: `POST /api/company-admin/integrations/google/sync`
  - **Response**: `{ success: boolean }`
  - **Errors**: `500` returns `{ error: string }`
