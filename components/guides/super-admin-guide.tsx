// components/guides/super-admin-guide.tsx
export function SuperAdminGuide() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Super Admin Guide</h1>
      <div className="prose">
        <h2>Welcome to the Super Admin Dashboard!</h2>
        <p>
          This guide will walk you through the key features of the super admin
          interface.
        </p>
        <h3>Companies</h3>
        <p>
          The companies page allows you to create and manage companies on the
          platform. You can create a new company by clicking the &quot;Create
          Company&quot; button. You can also manage a company&apos;s settings by
          clicking the &quot;Manage&quot; button next to the company&apos;s
          name.
        </p>
        <h3>Documents</h3>
        <p>
          The documents page allows you to upload and manage documents for each
          company. You can upload a new document by clicking the &quot;Upload
          Document&quot; button. You can also manage a document by clicking the
          &quot;Manage&quot; button next to the document&apos;s name.
        </p>
        <h3>Users</h3>
        <p>
          The users page allows you to manage users on the platform. You can
          assign a role to a user by clicking the &quot;Assign Role&quot;
          button.
        </p>
      </div>
    </div>
  );
}
