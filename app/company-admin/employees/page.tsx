import { auth } from '@/app/(auth)/stack-auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export default async function EmployeesPage() {
  const session = await auth();
  
  if (!session?.user?.companyId) {
    redirect('/login');
  }
  
  const employees = await db
    .select()
    .from(users)
    .where(eq(users.companyId, session.user.companyId))
    .orderBy(users.firstName, users.lastName);
  
  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Employees</h1>
          <p className="text-muted-foreground">Manage your organization&apos;s employees</p>
        </div>
        <Button asChild>
          <a href="/company-admin/employees/new">Add Employee</a>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Employee List</CardTitle>
          <CardDescription>All employees in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">{`${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'N/A'}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.department || 'N/A'}</TableCell>
                  <TableCell className="capitalize">{employee.role || 'employee'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      employee.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {employee.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/company-admin/employees/${employee.id}`}>Edit</a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {employees.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No employees found. Add your first employee to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}