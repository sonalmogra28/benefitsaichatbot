import { auth } from '@/app/(auth)/stack-auth';
import { redirect } from 'next/navigation';
import { withAuthTenantContext } from '@/lib/db/tenant-context';
import { db } from '@/lib/db';
import { users, benefitPlans, benefitEnrollments } from '@/lib/db/schema-v2';
import { eq, and, count } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

async function getCompanyStats(companyId: string) {
  const [employeeCount] = await db
    .select({ count: count() })
    .from(users)
    .where(eq(users.companyId, companyId));
    
  const [planCount] = await db
    .select({ count: count() })
    .from(benefitPlans)
    .where(and(eq(benefitPlans.companyId, companyId), eq(benefitPlans.isActive, true)));
    
  const [enrollmentCount] = await db
    .select({ count: count() })
    .from(benefitEnrollments)
    .innerJoin(users, eq(benefitEnrollments.userId, users.id))
    .where(and(
      eq(users.companyId, companyId),
      eq(benefitEnrollments.status, 'active')
    ));
    
  return {
    employees: employeeCount?.count || 0,
    activePlans: planCount?.count || 0,
    activeEnrollments: enrollmentCount?.count || 0,
  };
}

export default async function CompanyAdminDashboard() {
  const session = await auth();
  
  if (!session?.user?.companyId) {
    redirect('/login');
  }
  
  const stats = await getCompanyStats(session.user.companyId);
  
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Company Dashboard</h1>
        <p className="text-muted-foreground">Manage your company&apos;s benefits and employees</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.employees}</div>
            <p className="text-xs text-muted-foreground">Active users in your organization</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Benefit Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePlans}</div>
            <p className="text-xs text-muted-foreground">Plans available for enrollment</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeEnrollments}</div>
            <p className="text-xs text-muted-foreground">Employees enrolled in benefits</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a href="/company-admin/employees/new" className="block p-4 border rounded-lg hover:bg-muted">
              Add New Employee
            </a>
            <a href="/company-admin/benefits/new" className="block p-4 border rounded-lg hover:bg-muted">
              Create Benefit Plan
            </a>
            <a href="/company-admin/enrollments" className="block p-4 border rounded-lg hover:bg-muted">
              Manage Enrollments
            </a>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates in your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Activity tracking coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}