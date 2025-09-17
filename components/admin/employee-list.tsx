'use client';

import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { emailService } from '@/lib/services/email.service';
import {
  Search,
  MoreHorizontal,
  Mail,
  Download,
  Upload,
  UserPlus,
  Users,
  Activity,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Employee {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'admin' | 'company_admin' | 'super_admin';
  status: 'active' | 'pending' | 'inactive';
  department?: string;
  enrollmentStatus?: 'enrolled' | 'not_enrolled' | 'pending';
  lastActive?: Date;
  createdAt: Date;
}

interface EmployeeListProps {
  companyId: string;
  companyName?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function EmployeeList({
  companyId,
  companyName = 'Your Company',
}: EmployeeListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showBulkUploadDialog, setShowBulkUploadDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'employee',
    department: '',
    firstName: '',
    lastName: '',
  });
  const { toast } = useToast();

  const { data, error, isLoading } = useSWR(
    `/api/company-admin/employees?companyId=${companyId}&search=${searchQuery}&role=${filterRole}&status=${filterStatus}`,
    fetcher,
  );

  const employees: Employee[] =
    data?.employees.map((emp: any) => ({
      ...emp,
      lastActive: emp.lastActive ? new Date(emp.lastActive) : undefined,
      createdAt: new Date(emp.createdAt),
    })) || [];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmployees(employees.map((e) => e.id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleSelectEmployee = (employeeId: string, checked: boolean) => {
    if (checked) {
      setSelectedEmployees([...selectedEmployees, employeeId]);
    } else {
      setSelectedEmployees(selectedEmployees.filter((id) => id !== employeeId));
    }
  };

  const handleInviteEmployee = async () => {
    try {
      const response = await fetch('/api/company-admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to invite employee');
      }

      toast({
        title: 'Invitation Sent',
        description: `Invitation email sent to ${inviteForm.email}`,
      });

      setShowInviteDialog(false);
      setInviteForm({
        email: '',
        role: 'employee',
        department: '',
        firstName: '',
        lastName: '',
      });

      mutate(
        `/api/company-admin/employees?companyId=${companyId}&search=${searchQuery}&role=${filterRole}&status=${filterStatus}`,
      );
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to send invitation',
        variant: 'destructive',
      });
    }
  };

  const handleEmployeeAction = async (action: string, employeeId: string) => {
    try {
      if (action === 'deactivate') {
        const response = await fetch(
          `/api/company-admin/employees/${employeeId}`,
          {
            method: 'DELETE',
          },
        );

        if (!response.ok) throw new Error('Failed to deactivate employee');

        toast({
          title: 'Employee Deactivated',
          description: 'The employee has been deactivated successfully',
        });

        mutate(
          `/api/company-admin/employees?companyId=${companyId}&search=${searchQuery}&role=${filterRole}&status=${filterStatus}`,
        );
      } else if (action === 'send-email') {
        try {
          const response = await fetch('/api/admin/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              employeeId: employeeId,
              type: 'welcome',
              companyId
            }),
          });

          if (response.ok) {
            toast({
              title: 'Email Sent',
              description: 'Welcome email has been sent to the employee',
            });
          } else {
            throw new Error('Failed to send email');
          }
        } catch (error) {
          toast({
            title: 'Error',
            description: 'Failed to send email to employee',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${action} employee`,
        variant: 'destructive',
      });
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedEmployees.length === 0) {
      toast({
        title: 'No employees selected',
        description: 'Please select at least one employee',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/bulk-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          employeeIds: selectedEmployees,
          companyId
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Bulk Action Completed',
          description: `${result.results.success} employees processed successfully. ${result.results.failed} failed.`,
        });
        
        // Refresh the data
        mutate(
          `/api/company-admin/employees?companyId=${companyId}&search=${searchQuery}&role=${filterRole}&status=${filterStatus}`
        );
      } else {
        throw new Error(result.error || 'Bulk action failed');
      }
      
      setSelectedEmployees([]);
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${action}`,
        variant: 'destructive',
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'company_admin':
        return 'default';
      case 'admin':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="size-4 text-green-500" />;
      case 'pending':
        return <AlertCircle className="size-4 text-yellow-500" />;
      case 'inactive':
        return <XCircle className="size-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getEnrollmentBadge = (status?: string) => {
    switch (status) {
      case 'enrolled':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Enrolled
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Pending
          </Badge>
        );
      case 'not_enrolled':
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-800">
            Not Enrolled
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <Activity className="size-8 animate-spin text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Loading employees...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="size-8 text-red-500 mx-auto mb-4" />
            <p className="text-red-500">Failed to load employees</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="size-6" />
            Employee Management
          </h2>
          <p className="text-muted-foreground">
            {employees.length} total employees •{' '}
            {employees.filter((e) => e.status === 'active').length} active
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowBulkUploadDialog(true)}
          >
            <Upload className="size-4 mr-2" />
            Import CSV
          </Button>
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="size-4 mr-2" />
            Invite Employee
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="company_admin">Company Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedEmployees.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                {selectedEmployees.length} employee
                {selectedEmployees.length > 1 ? 's' : ''} selected
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('export')}
                >
                  <Download className="size-4 mr-2" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkAction('send-email')}
                >
                  <Mail className="size-4 mr-2" />
                  Send Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => handleBulkAction('deactivate')}
                >
                  Deactivate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Employees</CardTitle>
              <CardDescription>
                Manage employee accounts and permissions
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="size-4 mr-2" />
              Export All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">
                    <Checkbox
                      checked={
                        selectedEmployees.length === employees.length &&
                        employees.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </th>
                  <th className="text-left p-4 font-medium">Employee</th>
                  <th className="text-left p-4 font-medium">Role</th>
                  <th className="text-left p-4 font-medium">Department</th>
                  <th className="text-left p-4 font-medium">Benefits</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Last Active</th>
                  <th className="text-left p-4" />
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedEmployees.includes(employee.id)}
                        onCheckedChange={(checked) =>
                          handleSelectEmployee(employee.id, checked as boolean)
                        }
                      />
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{employee.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {employee.email}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant={getRoleBadgeVariant(employee.role)}>
                        {employee.role === 'company_admin'
                          ? 'Company Admin'
                          : employee.role.charAt(0).toUpperCase() +
                            employee.role.slice(1)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">
                        {employee.department || '-'}
                      </span>
                    </td>
                    <td className="p-4">
                      {getEnrollmentBadge(employee.enrollmentStatus)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(employee.status)}
                        <span className="text-sm capitalize">
                          {employee.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">
                        {employee.lastActive
                          ? formatDistanceToNow(employee.lastActive, {
                              addSuffix: true,
                            })
                          : 'Never'}
                      </span>
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>View Profile</DropdownMenuItem>
                          <DropdownMenuItem>Edit Details</DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              handleEmployeeAction('send-email', employee.id)
                            }
                          >
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuItem>View Benefits</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() =>
                              handleEmployeeAction('deactivate', employee.id)
                            }
                          >
                            {employee.status === 'active'
                              ? 'Deactivate'
                              : 'Activate'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {employees.length === 0 && (
            <div className="text-center py-8">
              <Users className="size-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No employees found</h3>
              <p className="text-muted-foreground">
                {searchQuery || filterRole !== 'all' || filterStatus !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start by inviting your first employee'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Employee Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New Employee</DialogTitle>
            <DialogDescription>
              Send an invitation email to add a new employee to {companyName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="employee@company.com"
                value={inviteForm.email}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, email: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invite-first-name">First Name (Optional)</Label>
                <Input
                  id="invite-first-name"
                  placeholder="John"
                  value={inviteForm.firstName}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-last-name">Last Name (Optional)</Label>
                <Input
                  id="invite-last-name"
                  placeholder="Doe"
                  value={inviteForm.lastName}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, lastName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value) =>
                  setInviteForm({ ...inviteForm, role: value })
                }
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="company_admin">Company Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-department">Department (Optional)</Label>
              <Input
                id="invite-department"
                placeholder="e.g., Engineering, Sales, HR"
                value={inviteForm.department}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, department: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleInviteEmployee} disabled={!inviteForm.email}>
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog
        open={showBulkUploadDialog}
        onOpenChange={setShowBulkUploadDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Employees from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file with employee information to add multiple
              employees at once
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="size-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm font-medium mb-2">
                Drop your CSV file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                CSV should include: Name, Email, Department, Role
              </p>
              <Button variant="outline" size="sm">
                Choose File
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">CSV Format:</p>
              <code className="text-xs bg-muted p-2 rounded block">
                Name,Email,Department,Role
                <br />
                John Doe,john@company.com,Engineering,employee
                <br />
                Jane Smith,jane@company.com,HR,admin
              </code>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkUploadDialog(false)}
            >
              Cancel
            </Button>
            <Button disabled>Upload & Process</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
