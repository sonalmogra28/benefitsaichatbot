import { auth } from '@/app/(auth)/stack-auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { users, benefitPlans, benefitEnrollments, knowledgeBaseDocuments } from '@/lib/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { CompanyDashboard } from '@/components/admin/company-dashboard';

export const dynamic = 'force-dynamic';

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

  const [documentCount] = await db
    .select({ count: count() })
    .from(knowledgeBaseDocuments)
    .where(eq(knowledgeBaseDocuments.companyId, companyId));
    
  return {
    employees: employeeCount?.count || 0,
    activePlans: planCount?.count || 0,
    activeEnrollments: enrollmentCount?.count || 0,
    documentCount: documentCount?.count || 0,
    totalCost: 25000, // TODO: Calculate from actual enrollment data
    utilisationRate: 0.75, // TODO: Calculate from actual usage data
  };
}

async function getRecentActivity(companyId: string) {
  // TODO: Implement actual activity tracking
  // For now, return mock data
  return [
    {
      id: '1',
      type: 'enrollment' as const,
      description: 'New employee enrolled in health insurance',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      status: 'success' as const,
    },
    {
      id: '2',
      type: 'document' as const,
      description: 'Benefits handbook uploaded',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      status: 'success' as const,
    },
    {
      id: '3',
      type: 'employee' as const,
      description: 'Employee added to system',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      status: 'success' as const,
    },
  ];
}

export default async function CompanyAdminDashboard() {
  const session = await auth();
  
  if (!session?.user?.companyId) {
    redirect('/login');
  }

  // Get company name from the user's company data
  const companyName = session.user.company?.name || 'Your Company';
  
  const [stats, recentActivity] = await Promise.all([
    getCompanyStats(session.user.companyId),
    getRecentActivity(session.user.companyId),
  ]);
  
  return (
    <div className="p-8">
      <CompanyDashboard 
        stats={stats}
        recentActivity={recentActivity}
        companyName={companyName}
        companyId={session.user.companyId}
      />
    </div>
  );
}