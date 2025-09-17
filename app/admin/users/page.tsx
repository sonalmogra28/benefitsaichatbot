'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  UserPlus,
  Shield,
  Mail,
  MoreVertical,
  Edit,
  Trash2,
  Key,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface User {
  id: string;
  name: string;
  email: string;
  company: string;
  role:
    | 'super_admin'
    | 'platform_admin'
    | 'company_admin'
    | 'hr_admin'
    | 'employee';
  status: 'active' | 'pending' | 'suspended';
  lastLogin: Date | null;
  createdAt: Date;
}

export default function AdminUsersPage() {
  const { account, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!loading && !account) {
      router.push('/login');
    } else if (account) {
      account?.getIdTokenResult().then((idTokenResult: any) => {
        if (
          !idTokenResult.claims.platform_admin &&
          !idTokenResult.claims.super_admin
        ) {
          router.push('/');
        }
      });
    }
  }, [account, loading, router]);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.company.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getRoleBadge = (role: string) => {
    const roleColors = {
      super_admin: 'bg-purple-100 text-purple-700',
      platform_admin: 'bg-blue-100 text-blue-700',
      company_admin: 'bg-indigo-100 text-indigo-700',
      hr_admin: 'bg-green-100 text-green-700',
      employee: 'bg-gray-100 text-gray-700',
    };

    const roleLabels = {
      super_admin: 'Super Admin',
      platform_admin: 'Platform Admin',
      company_admin: 'Company Admin',
      hr_admin: 'HR Admin',
      employee: 'Employee',
    };

    return (
      <Badge className={roleColors[role as keyof typeof roleColors]}>
        {roleLabels[role as keyof typeof roleLabels]}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700">Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-700">Suspended</Badge>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage platform users and permissions
          </p>
        </div>
        <Button onClick={() => router.push('/admin/users/new')}>
          <UserPlus className="mr-2 size-4" />
          Add User
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">All roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                users.filter(
                  (u) =>
                    u.role === 'super_admin' ||
                    u.role === 'platform_admin' ||
                    u.role === 'company_admin',
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Admin accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting activation</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <div className="flex items-center space-x-2 mt-4">
            <Search className="size-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto size-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {searchTerm
                  ? 'Try adjusting your search'
                  : 'No users registered yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-4 pb-2 border-b text-sm font-medium text-muted-foreground">
                <div className="col-span-3">Name</div>
                <div className="col-span-2">Email</div>
                <div className="col-span-2">Company</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Actions</div>
              </div>
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-12 gap-4 py-3 border-b items-center hover:bg-muted/50 transition-colors"
                >
                  <div className="col-span-3">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {user.lastLogin
                        ? `Last login: ${new Date(user.lastLogin).toLocaleDateString()}`
                        : 'Never logged in'}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center text-sm">
                      <Mail className="size-3 mr-1 text-muted-foreground" />
                      {user.email}
                    </div>
                  </div>
                  <div className="col-span-2 text-sm">{user.company}</div>
                  <div className="col-span-2">{getRoleBadge(user.role)}</div>
                  <div className="col-span-2">
                    {getStatusBadge(user.status)}
                  </div>
                  <div className="col-span-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Edit className="mr-2 size-4" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Key className="mr-2 size-4" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Shield className="mr-2 size-4" />
                          Change Role
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 size-4" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
