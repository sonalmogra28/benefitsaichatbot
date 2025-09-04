'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  MoreVertical,
  Edit,
  Trash2,
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

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  enrollmentStatus: 'enrolled' | 'pending' | 'not_enrolled';
  benefitsPlan: string;
  joinedDate: Date;
}

export default function CompanyEmployeesPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      user.getIdTokenResult().then((idTokenResult) => {
        if (
          !idTokenResult.claims.company_admin &&
          !idTokenResult.claims.hr_admin
        ) {
          router.push('/');
        }
      });
    }
  }, [user, loading, router]);

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enrolled':
        return <Badge className="bg-green-100 text-green-700">Enrolled</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>;
      case 'not_enrolled':
        return (
          <Badge className="bg-gray-100 text-gray-700">Not Enrolled</Badge>
        );
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
          <h1 className="text-3xl font-bold">Employee Management</h1>
          <p className="text-muted-foreground">
            Manage your organization&apos;s employees and their benefits
          </p>
        </div>
        <Button onClick={() => router.push('/company-admin/employees/new')}>
          <UserPlus className="mr-2 size-4" />
          Add Employee
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">Active members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                employees.filter((e) => e.enrollmentStatus === 'enrolled')
                  .length
              }
            </div>
            <p className="text-xs text-muted-foreground">In benefits plans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees.filter((e) => e.enrollmentStatus === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Enrollment in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Not Enrolled</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                employees.filter((e) => e.enrollmentStatus === 'not_enrolled')
                  .length
              }
            </div>
            <p className="text-xs text-muted-foreground">Need to enroll</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Employee Directory</CardTitle>
          <div className="flex items-center space-x-2 mt-4">
            <Search className="size-4 text-muted-foreground" />
            <Input
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto size-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No employees found</p>
              <p className="text-sm text-muted-foreground mt-2">
                {searchTerm
                  ? 'Try adjusting your search'
                  : 'Add your first employee to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-4 pb-2 border-b text-sm font-medium text-muted-foreground">
                <div className="col-span-3">Name</div>
                <div className="col-span-2">Email</div>
                <div className="col-span-2">Department</div>
                <div className="col-span-2">Benefits Plan</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Actions</div>
              </div>
              {filteredEmployees.map((employee) => (
                <div
                  key={employee.id}
                  className="grid grid-cols-12 gap-4 py-3 border-b items-center hover:bg-muted/50 transition-colors"
                >
                  <div className="col-span-3">
                    <div className="font-medium">{employee.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {employee.role}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center text-sm">
                      <Mail className="size-3 mr-1 text-muted-foreground" />
                      {employee.email}
                    </div>
                  </div>
                  <div className="col-span-2 text-sm">
                    {employee.department}
                  </div>
                  <div className="col-span-2 text-sm">
                    {employee.benefitsPlan || 'Not selected'}
                  </div>
                  <div className="col-span-2">
                    {getStatusBadge(employee.enrollmentStatus)}
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
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="mr-2 size-4" />
                          Send Invitation
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 size-4" />
                          Remove Employee
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

      <Card>
        <CardHeader>
          <CardTitle>Bulk Actions</CardTitle>
          <CardDescription>
            Perform actions on multiple employees
          </CardDescription>
        </CardHeader>
        <CardContent className="flex space-x-2">
          <Button variant="outline">
            <Mail className="mr-2 size-4" />
            Send Bulk Invitations
          </Button>
          <Button variant="outline">
            <Users className="mr-2 size-4" />
            Export Employee List
          </Button>
          <Button variant="outline">
            <UserPlus className="mr-2 size-4" />
            Import Employees
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
