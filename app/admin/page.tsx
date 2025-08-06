import { auth } from '@/app/(auth)/stack-auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { companies, users, benefitPlans, benefitEnrollments } from '@/lib/db/schema';
import { count, sql, eq } from 'drizzle-orm';
import { SuperAdminDashboard } from '@/components/super-admin/super-admin-dashboard';

export const dynamic = 'force-dynamic';

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
      <SuperAdminDashboard stats={stats} />
    </div>
  );
}