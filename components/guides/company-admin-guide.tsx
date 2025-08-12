// components/guides/company-admin-guide.tsx
export function CompanyAdminGuide() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Company Admin Guide</h1>
      <div className="prose">
        <h2>Welcome to the Company Admin Dashboard!</h2>
        <p>
          This guide will walk you through the key features of the company
          admin interface.
        </p>
        <h3>Benefits</h3>
        <p>
          The benefits page allows you to manage your company's benefit plans.
          You can compare different benefit plans by clicking the "Compare"
          button.
        </p>
        <h3>Documents</h3>
        <p>
          The documents page allows you to upload and manage your company's
          documents. You can upload a new document by clicking the "Upload"
          button.
        </p>
        <h3>Employees</h3>
        <p>
          The employees page allows you to manage your company's employees.
          You can manage an employee's settings by clicking the "Manage"
          button next to the employee's name.
        </p>
        <h3>Settings</h3>
        <p>
          The settings page allows you to manage your company's settings. You
          can manage your Google Workspace integration on the "Integrations"
          page.
        </p>
      </div>
    </div>
  );
}
