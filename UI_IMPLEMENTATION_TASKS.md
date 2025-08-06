# UI Implementation Tasks for Company Admin and Super Admin

This document outlines the exact UI deliverables required to complete the Company Admin and Super Admin interfaces and get them production-ready. Follow each task systematically.

---

## 1. Company Admin UI

-### 1.1 Layout and Navigation (`app/company-admin/layout.tsx`)

- [ ] Add sidebar with links to `Employees`, `Documents`, `Benefits`, and `Settings`.
- [ ] Integrate `Header` component showing current company name and user avatar.

-### 1.2 Employees Page (`app/company-admin/employees/page.tsx`)

- [ ] Implement employee list table with columns: Name, Email, Role, Status, Actions (Edit, Suspend).
- [ ] Add search and pagination controls.
- [ ] Create `EditEmployeeModal` component for updating role and status.
- [ ] Wire API calls to `/api/company-admin/employees` endpoints.

-### 1.3 Employee Details Route (`app/company-admin/employees/[id]/page.tsx`)

- [ ] Display employee profile: name, email, join date, usage metrics.
- [ ] Include action buttons: `Reset Password`, `View Audit Logs`.

-### 1.4 Documents Page (`app/company-admin/documents/page.tsx`)

- [ ] Render list of uploaded documents with columns: Title, Type, Uploaded At, Actions (View, Delete).
- [ ] Add file upload button and progress indicator.
- [ ] Use `DocumentPreview` component for in-line previews.

-### 1.5 Benefits Page (`app/company-admin/benefits/page.tsx`)

- [ ] Show current benefit plan summary (name, coverage, enrollment period).
- [ ] Implement `CalculateCosts` component with form inputs (dependents, salary) and result display.
- [ ] Add `Enroll` button (disabled outside enrollment period).

-### 1.6 Settings Section (`app/company-admin/settings/page.tsx`)

- [ ] Create settings form for company profile: Company Name, Domain, Billing Plan, Feature Toggles.
- [ ] Use toggles for each feature in `CompanyFeature` type.
- [ ] Add `Save Changes` button with form validation and loading state.

---

## 2. Super Admin UI

-### 2.1 Super Admin Layout and Navigation (`components/layouts/SuperAdminLayout.tsx`)

- [ ] Create a new layout component with top nav and side nav links: Analytics, Companies, Users, Export Data, Settings.
- [ ] Display current platform admin user avatar and menu.

-### 2.2 Analytics Dashboard (`components/super-admin/analytics-dashboard.tsx`)

- [ ] Fill in each `CardContent` with Metric components:
  - Total Companies
  - Total Users
  - Total Documents
  - Total Chats
  - Active Users (last 24h)
  - Storage Usage (chart or progress bar)
  - Monthly Revenue
  - Usage Patterns (line chart)

-### 2.3 Companies Table (`components/super-admin/companies-table.tsx`)

- [ ] Render `<TableRow>` entries in the map, populating each `<TableCell>` for all columns.
- [ ] Implement `onEdit`, `onDelete`, `onViewDetails` actions via buttons/icons.
- [ ] Add selection and bulk delete actions.

-### 2.4 Create Company Dialog (`components/super-admin/create-company-dialog.tsx`)

- [ ] Build form fields for: Name, Domain, Admin Email, Billing Plan (dropdown), Feature checkboxes.
- [ ] Add validation messages.
- [ ] Implement `handleSubmit` API call to `/api/super-admin/companies` and call `onSuccess`.

-### 2.5 Company Details Page (`app/super-admin/companies/[id]/page.tsx`)

- [ ] Display company profile, stats, feature toggles, and audit log entries.
- [ ] Provide tabs: Overview, Users, Documents, Usage, Settings.

-### 2.6 Users Management (`app/super-admin/users/page.tsx`)

- [ ] Render list of all users across companies with filters (Company, Role, Status).
- [ ] Add bulk actions: Suspend, Change Role, Delete.

-### 2.7 Export Data Section (`app/super-admin/export/page.tsx`)

- [ ] Create form matching `exportSchema`: Date pickers for start/end, multi-select for includeTypes, format dropdown.
- [ ] Show download link/button on successful export.

-### 2.8 Settings Page (`app/super-admin/settings/page.tsx`)

- [ ] Build form matching `settingsSchema` with appropriate input types (toggles, selects, number inputs).
- [ ] Add `Save` button and call PATCH endpoint.
- [ ] Add branding upload inputs (Logo, Favicon) with preview component and integrate API call to upload branding assets.

---

## 3. Deliverables File

- This file: `UI_IMPLEMENTATION_TASKS.md` lists all UI tasks.
- Use it as a checklist to update or create UI components systematically.

---

**Next Steps:**
-1. Review this list and assign tickets for each task.
2. Implement components one by one.
3. Write corresponding unit/integration tests for each UI piece.
4. Conduct QA review and accessibility audit.
