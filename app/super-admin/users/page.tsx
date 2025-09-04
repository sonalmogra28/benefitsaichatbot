'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';

function SuperAdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);

  const fetchUsers = useCallback(async () => {
    if (user) {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });
      const data = await response.json();
      setUsers(data.users);
    }
  }, [user]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (uid: string, role: string, companyId: string) => {
    if (user) {
      const idToken = await user.getIdToken();
      await fetch(`/api/admin/users/${uid}/assign-role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ role, companyId }),
      });
      fetchUsers();
    }
  };

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map((u) => (
          <li key={u.uid}>
            {u.email} - {u.customClaims?.role}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                const role = data.get('role') as string;
                const companyId = data.get('companyId') as string;
                handleRoleChange(u.uid, role, companyId);
              }}
            >
              <select name="role" defaultValue={u.customClaims?.role}>
                <option value="employee">Employee</option>
                <option value="company_admin">Company Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <input
                type="text"
                name="companyId"
                defaultValue={u.customClaims?.companyId}
              />
              <button type="submit">Save</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SuperAdminUsersPage;
