import { auth } from '@/app/(auth)/stack-auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { companies, users, benefitPlans, benefitEnrollments } from '@/lib/db/schema-v2';
import { count, sql, eq } from 'drizzle-orm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

async function getPlatformStats() {
  const [companyCount] = await db
    .select({ count: count() })
    .from(companies)
    .where(sql`${companies.domain} != 'platform'`);
    
  const [userCount] = await db
    .select({ count: count() })
    .from(users);
    
  const [planCount] = await db
    .select({ count: count() })
    .from(benefitPlans);
    
  const [enrollmentCount] = await db
    .select({ count: count() })
    .from(benefitEnrollments)
    .where(eq(benefitEnrollments.status, 'active'));
    
  // Get recent companies
  const recentCompanies = await db
    .select({
      id: companies.id,
      name: companies.name,
      domain: companies.domain,
      subscriptionTier: companies.subscriptionTier,
      createdAt: companies.createdAt
    })
    .from(companies)
    .where(sql`${companies.domain} != 'platform'`)
    .orderBy(sql`${companies.createdAt} DESC`)
    .limit(5);
    
  return {
    totalCompanies: companyCount?.count || 0,
    totalUsers: userCount?.count || 0,
    totalPlans: planCount?.count || 0,
    activeEnrollments: enrollmentCount?.count || 0,
    recentCompanies
  };
}

export default async function AdminDashboard() {
  const session = await auth();
  
  if (!session?.user || session.user.type !== 'platform_admin') {
    redirect('/login');
  }
  
  const stats = await getPlatformStats();
  
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Platform Dashboard</h1>
        <p className="text-muted-foreground">Manage the Benefits AI platform</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCompanies}</div>
            <p className="text-xs text-muted-foreground">Active client companies</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Across all companies</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Benefit Plans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPlans}</div>
            <p className="text-xs text-muted-foreground">Total plans created</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Active Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeEnrollments}</div>
            <p className="text-xs text-muted-foreground">Current enrollments</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Companies</CardTitle>
            <CardDescription>Latest companies to join the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentCompanies.map((company) => (
                <div key={company.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{company.name}</p>
                    <p className="text-sm text-muted-foreground">{company.domain}.benefitsai.com</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(company.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs font-medium">{company.subscriptionTier}</p>
                  </div>
                </div>
              ))}
              
              {stats.recentCompanies.length === 0 && (
                <p className="text-sm text-muted-foreground">No companies yet</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Platform management tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a href="/admin/companies/new" className="block p-4 border rounded-lg hover:bg-muted">
              Add New Company
            </a>
            <a href="/admin/users" className="block p-4 border rounded-lg hover:bg-muted">
              Manage Users
            </a>
            <a href="/admin/analytics" className="block p-4 border rounded-lg hover:bg-muted">
              View Platform Analytics
            </a>
            <a href="/admin/settings" className="block p-4 border rounded-lg hover:bg-muted">
              Platform Settings
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}