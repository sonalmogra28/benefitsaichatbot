'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  companyId?: string;
}

export default function AssignRolePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/super-admin/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/super-admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: newRole }),
      });

      if (!response.ok) throw new Error('Failed to update role');

      toast({
        title: 'Success',
        description: 'User role updated successfully',
      });

      // Refresh users
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user role',
        variant: 'destructive',
      });
    }
  };

  const handleBackToDashboard = () => {
    window.location.href = '/super-admin';
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Assign User Roles</h1>

      <div className="space-y-4">
        {users.map((user) => (
          <Card key={user.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{user.email}</p>
                <p className="text-sm text-muted-foreground">
                  Current role: {user.role || 'employee'}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <Select
                  defaultValue={user.role || 'employee'}
                  onValueChange={(value) => updateUserRole(user.id, value)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="hr_admin">HR Admin</SelectItem>
                    <SelectItem value="company_admin">Company Admin</SelectItem>
                    <SelectItem value="platform_admin">
                      Platform Admin
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        <Button onClick={handleBackToDashboard}>Back to Dashboard</Button>
      </div>
    </div>
  );
}
