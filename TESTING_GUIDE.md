# Testing Guide for Live Environment

This guide provides a comprehensive checklist to test the Benefits AI Platform in a live production environment. It's crucial to perform these tests after every deployment to ensure all features are working as expected.

## Testing Roles

-   **Test User 1:** Super Admin
-   **Test User 2:** Company Admin
-   **Test User 3:** Employee

---

## Part 1: Super Admin User Journey

**Objective:** Verify that the super admin can manage the entire platform.

| # | Test Case | Expected Result | Status |
| :-- | :--- | :--- | :--- |
| 1.1 | **Login:** Log in as the super admin. | Successfully redirected to the `/super-admin` dashboard. | ☐ PASS / ☐ FAIL |
| 1.2 | **Create Company:** Navigate to the "Companies" page and create a new company. | The new company appears in the companies table. | ☐ PASS / ☐ FAIL |
| 1.3 | **Upload Document:** Navigate to the "Documents" page, select the newly created company, and upload a PDF document. | The document uploads successfully and appears in the document list. The RAG pipeline should process it. | ☐ PASS / ☐ FAIL |
| 1.4 | **Assign User Role:** Go to the "Users" page and assign the "company_admin" role to a test user for the new company. | The user's role is updated in the database and they now have company admin privileges. | ☐ PASS / ☐ FAIL |

---

## Part 2: Company Admin User Journey

**Objective:** Verify that the company admin can manage their own company's settings and users.

| # | Test Case | Expected Result | Status |
| :-- | :--- | :--- | :--- |
| 2.1 | **Login:** Log in as the company admin. | Successfully redirected to the company admin dashboard for the correct company. | ☐ PASS / ☐ FAIL |
| 2.2 | **View Employees:** Navigate to the "Employees" page. | Only employees belonging to the correct company are visible. | ☐ PASS / ☐ FAIL |
| 2.3 | **Manage Benefits:** Go to the "Benefits" page and verify you can view and compare benefit plans. | All benefit-related features work correctly. | ☐ PASS / ☐ FAIL |
| 2.4 | **HRIS Integration:** Navigate to "Settings > Integrations" and connect a Google Workspace account. | The OAuth flow completes successfully and a test user sync can be initiated. | ☐ PASS / ☐ FAIL |
| 2.5 | **Data Isolation:** Attempt to access a super admin URL (e.g., `/super-admin/companies`). | Access is denied, and the user is redirected or shown a "Forbidden" error. | ☐ PASS / ☐ FAIL |

---

## Part 3: Employee User Journey

**Objective:** Verify that employees can use the chat and self-service features correctly.

| # | Test Case | Expected Result | Status |
| :-- | :--- | :--- | :--- |
| 3.1 | **Login:** Log in as a regular employee. | Successfully redirected to the main chat interface. | ☐ PASS / ☐ FAIL |
| 3.2 | **Chat with RAG:** Ask the chatbot a question that can only be answered by the document uploaded by the super admin. | The chatbot provides a correct and relevant answer based on the document's content. | ☐ PASS / ☐ FAIL |
| 3.3 | **View Benefits:** Ask the chatbot to show your current benefits or navigate to the benefits page. | The correct benefits for the employee are displayed. | ☐ PASS / ☐ FAIL |
| 3.4 | **Data Isolation:** Attempt to access an admin URL (e.g., `/company-admin/employees`). | Access is denied, and the user is redirected or shown a "Forbidden" error. | ☐ PASS / ☐ FAIL |

---

## Part 4: Technical & Security Checks

**Objective:** Verify the technical health and security of the live application.

| # | Test Case | Expected Result | Status |
| :-- | :--- | :--- | :--- |
| 4.1 | **Check Console Logs:** Open the browser's developer tools and check for any console errors while navigating the app. | No critical errors are present. | ☐ PASS / ☐ FAIL |
| 4.2 | **Check Network Requests:** Monitor the network tab for any failing API requests (4xx or 5xx status codes). | All API requests are successful. | ☐ PASS / ☐ FAIL |
| 4.3 | **Test In-App Guide:** Navigate to the `/guide` page as each user role. | The correct guide is displayed for each role. | ☐ PASS / ☐ FAIL |

By completing this testing checklist, you can be confident that your application is fully functional and ready for users.
